
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.43.1' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/Nav.svelte generated by Svelte v3.43.1 */

    const file$1 = "src/Nav.svelte";

    function create_fragment$1(ctx) {
    	let nav;
    	let ul;
    	let li0;
    	let a0;
    	let t1;
    	let li1;
    	let a1;
    	let t3;
    	let li2;
    	let a2;

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			ul = element("ul");
    			li0 = element("li");
    			a0 = element("a");
    			a0.textContent = "Almonds On Reddit";
    			t1 = space();
    			li1 = element("li");
    			a1 = element("a");
    			a1.textContent = "Under Construction";
    			t3 = space();
    			li2 = element("li");
    			a2 = element("a");
    			a2.textContent = "Under Construction";
    			attr_dev(a0, "href", "https://www.reddit.com/r/forthealmonds/");
    			attr_dev(a0, "target", "_blank");
    			attr_dev(a0, "class", "svelte-gs918y");
    			add_location(a0, file$1, 7, 10, 69);
    			attr_dev(li0, "class", "svelte-gs918y");
    			add_location(li0, file$1, 6, 8, 54);
    			attr_dev(a1, "href", "tbh.html");
    			attr_dev(a1, "target", "_blank");
    			attr_dev(a1, "class", "svelte-gs918y");
    			add_location(a1, file$1, 11, 12, 222);
    			attr_dev(li1, "class", "svelte-gs918y");
    			add_location(li1, file$1, 10, 8, 205);
    			attr_dev(a2, "href", "tbh.html");
    			attr_dev(a2, "target", "_blank");
    			attr_dev(a2, "class", "svelte-gs918y");
    			add_location(a2, file$1, 15, 12, 320);
    			attr_dev(li2, "class", "svelte-gs918y");
    			add_location(li2, file$1, 14, 8, 303);
    			attr_dev(ul, "class", "svelte-gs918y");
    			add_location(ul, file$1, 5, 4, 41);
    			add_location(nav, file$1, 4, 0, 31);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, ul);
    			append_dev(ul, li0);
    			append_dev(li0, a0);
    			append_dev(ul, t1);
    			append_dev(ul, li1);
    			append_dev(li1, a1);
    			append_dev(ul, t3);
    			append_dev(ul, li2);
    			append_dev(li2, a2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Nav', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Nav> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Nav extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Nav",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.43.1 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let head;
    	let meta;
    	let t0;
    	let body;
    	let header;
    	let nav;
    	let t1;
    	let h20;
    	let t3;
    	let h1;
    	let t5;
    	let hr0;
    	let t6;
    	let section0;
    	let h21;
    	let t8;
    	let div;
    	let button0;
    	let t10;
    	let button1;
    	let t12;
    	let h22;
    	let t14;
    	let hr1;
    	let t15;
    	let section1;
    	let h23;
    	let t17;
    	let img0;
    	let img0_src_value;
    	let t18;
    	let hr2;
    	let t19;
    	let img1;
    	let img1_src_value;
    	let t20;
    	let hr3;
    	let t21;
    	let img2;
    	let img2_src_value;
    	let current;
    	nav = new Nav({ $$inline: true });

    	const block = {
    		c: function create() {
    			head = element("head");
    			meta = element("meta");
    			t0 = space();
    			body = element("body");
    			header = element("header");
    			create_component(nav.$$.fragment);
    			t1 = space();
    			h20 = element("h2");
    			h20.textContent = "Almond Prices Today(S&P 500)";
    			t3 = space();
    			h1 = element("h1");
    			h1.textContent = "500.679 USD/lbs";
    			t5 = space();
    			hr0 = element("hr");
    			t6 = space();
    			section0 = element("section");
    			h21 = element("h2");
    			h21.textContent = "Feature Vote";
    			t8 = space();
    			div = element("div");
    			button0 = element("button");
    			button0.textContent = "ALMDS Crypto";
    			t10 = space();
    			button1 = element("button");
    			button1.textContent = "Almondgachi - Pet Almonds";
    			t12 = space();
    			h22 = element("h2");
    			h22.textContent = "Option 1 is 340 votes ahead of Option 2";
    			t14 = space();
    			hr1 = element("hr");
    			t15 = space();
    			section1 = element("section");
    			h23 = element("h2");
    			h23.textContent = "Almonds Gallery";
    			t17 = space();
    			img0 = element("img");
    			t18 = space();
    			hr2 = element("hr");
    			t19 = space();
    			img1 = element("img");
    			t20 = space();
    			hr3 = element("hr");
    			t21 = space();
    			img2 = element("img");
    			attr_dev(meta, "name", "viewport");
    			attr_dev(meta, "content", "width=device-width, initial-scale=1.0");
    			add_location(meta, file, 5, 8, 80);
    			add_location(head, file, 4, 2, 65);
    			attr_dev(h20, "class", "svelte-1rq3jwp");
    			add_location(h20, file, 11, 12, 259);
    			attr_dev(h1, "class", "pricetext svelte-1rq3jwp");
    			add_location(h1, file, 14, 12, 339);
    			attr_dev(hr0, "class", "svelte-1rq3jwp");
    			add_location(hr0, file, 17, 12, 425);
    			add_location(header, file, 8, 8, 182);
    			attr_dev(h21, "class", "svelte-1rq3jwp");
    			add_location(h21, file, 20, 12, 494);
    			attr_dev(button0, "class", "buttonred svelte-1rq3jwp");
    			add_location(button0, file, 22, 12, 562);
    			attr_dev(button1, "class", "buttonblue svelte-1rq3jwp");
    			add_location(button1, file, 22, 60, 610);
    			attr_dev(div, "class", "buttons svelte-1rq3jwp");
    			add_location(div, file, 21, 12, 528);
    			attr_dev(h22, "class", "svelte-1rq3jwp");
    			add_location(h22, file, 24, 12, 703);
    			attr_dev(section0, "class", "voting");
    			add_location(section0, file, 19, 8, 456);
    			attr_dev(hr1, "class", "svelte-1rq3jwp");
    			add_location(hr1, file, 26, 8, 781);
    			attr_dev(h23, "class", "svelte-1rq3jwp");
    			add_location(h23, file, 28, 12, 816);
    			if (!src_url_equal(img0.src, img0_src_value = "/images/almondsgall1.jpg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "Almonds Drawing");
    			attr_dev(img0, "class", "svelte-1rq3jwp");
    			add_location(img0, file, 29, 12, 853);
    			attr_dev(hr2, "class", "imgline svelte-1rq3jwp");
    			add_location(hr2, file, 30, 12, 924);
    			if (!src_url_equal(img1.src, img1_src_value = "/images/almondsgall2.jpg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "Almond Tree");
    			attr_dev(img1, "class", "svelte-1rq3jwp");
    			add_location(img1, file, 32, 12, 972);
    			attr_dev(hr3, "class", "imgline svelte-1rq3jwp");
    			add_location(hr3, file, 33, 12, 1039);
    			if (!src_url_equal(img2.src, img2_src_value = "/images/almondsgall3.jpg")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "Almond With shell");
    			attr_dev(img2, "class", "svelte-1rq3jwp");
    			add_location(img2, file, 34, 12, 1074);
    			add_location(section1, file, 27, 8, 794);
    			attr_dev(body, "class", "svelte-1rq3jwp");
    			add_location(body, file, 7, 4, 167);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, head, anchor);
    			append_dev(head, meta);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, body, anchor);
    			append_dev(body, header);
    			mount_component(nav, header, null);
    			append_dev(header, t1);
    			append_dev(header, h20);
    			append_dev(header, t3);
    			append_dev(header, h1);
    			append_dev(header, t5);
    			append_dev(header, hr0);
    			append_dev(body, t6);
    			append_dev(body, section0);
    			append_dev(section0, h21);
    			append_dev(section0, t8);
    			append_dev(section0, div);
    			append_dev(div, button0);
    			append_dev(div, t10);
    			append_dev(div, button1);
    			append_dev(section0, t12);
    			append_dev(section0, h22);
    			append_dev(body, t14);
    			append_dev(body, hr1);
    			append_dev(body, t15);
    			append_dev(body, section1);
    			append_dev(section1, h23);
    			append_dev(section1, t17);
    			append_dev(section1, img0);
    			append_dev(section1, t18);
    			append_dev(section1, hr2);
    			append_dev(section1, t19);
    			append_dev(section1, img1);
    			append_dev(section1, t20);
    			append_dev(section1, hr3);
    			append_dev(section1, t21);
    			append_dev(section1, img2);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(nav.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(nav.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(head);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(body);
    			destroy_component(nav);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Nav });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
