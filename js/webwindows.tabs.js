/*! webwindows.js build:2.0.1, development. Copyright(c) 2014 procool <procool@procool.ru> New BSD Licensed */

/**********                                                                 
 * webWindows                                                          
 * Copyright(c) 2014 procool <procool@procool.ru>                ~   
 *                   prmim   <ya-prmim@yandex.ru>                 ~
 * License: New BSD License                                    c(__)  
**/


/* Main webWindows class: */
webWindows = new function () {

    /******************************/
    /* Private static constants:  */
    /******************************/

    var debug = 1;

    /* Default div wrapper's id: */
    var divwrapper_default = 'webwindows_wrapper';

    /* Default style: */
    var style_default = 'main';

    /* Name of CSS class, and subclasses ( e.g. ..._title ) */
    var style_class   = "webwindows_style_";


    /* Start CSS layer number(z-index): */
    var start_layer = 300;

    /* Maximum windows number: */
    var maxwindows = 99;

    /* Minimum window size(px): */
    var window_minwidth  = 150;
    var window_minheight = 30;

    /* Size of Window header height(px)*/
    var header_height = 16;

    /* webWindow DOM element id startment: */
    var window_dom_id = "webwindows_w_id";


    /* Win. Move throttle timeout: */
    var window_trottle_timeout = 30; // 35ms


    /* Hidden Ident class: */
    var hidden_ident_class = 'webwindows_hidden_ident_class';

    /******************************/
    /* Private static attributes: */
    /******************************/
    var divwrappers = {};    // key - divid, value - instance

    /* IE, OPERA, FireFOX: */
    var browsers = new Array( 0, 0, 0 );

    /* Maximum opened window_id: */
    var max_opened_window_id = 0;


    var tab_candidate = 0;


    /*****************************/
    /* Object constructor:       */
    var webWindows = function (params) {

        /* Private attributes: */
        this._divwrapper = divwrapper_default;

        /* Processing class parametrs: */
        if (params) {

            /* Get DIV Wrapper ID: */
            if ( params['wrapper'] ) {

                /* Save it as private attribute: */
                this._divwrapper = params['wrapper'];

                this['window_show_time'] = 0;
                this['window_hide_time'] = 0;

                /* 
                   Wraper allready used, 
                   return singletone: 
                */
                if ( divwrappers[ params.wrapper ] )
                    return divwrappers[ params.wrapper ];

                /* Create new record about this wrapper: */
                else {
                    divwrappers[ params.wrapper ] = this;
                    this._show_hide_windows_by_timeout(1000);
                }
            }
        }
    }



    var proto = webWindows.prototype;


    /************************/
    /* Public attributes:   */

    /* window settings: */
    proto['width']   = 450;
    proto['height']  = 300;

    proto['top']     = 50  + Math.random() * (250 - 50);
    proto['left']    = 100 + Math.random() * (350 - 100);

    /* Persional window ident: */
    proto['ident']   = '';

    /* Window flags: */
    proto['can_have_tabs'] = 1;
    proto['can_be_tab']    = 1;
    proto['can_maximize']  = 1;
    proto['can_minimize']  = 1;
    proto['can_fix']       = 1;
    proto['closeable']     = 1;
    proto['hide_on_close'] = 0; // Don't close window, just hide
    proto['onclose_all']   = 0; // Don't close all childs on close parent
    proto['resizable']     = 1;
    proto['style']         = style_default;
    proto['style_class']   = style_class + this['style'];
 

    /***********************/
    /* Private attributes: */


    /* Status flags: */
    proto._layer = 0;           // id in proto._windows_layers
    proto._id_in_group = 0;
    proto._group = -1;          // no group
    proto._is_closed = 0;
    proto._is_hidden = 0;
    proto._is_fixed = 0;
    proto._is_maximized = 0;
    proto._is_minimized = 0;
    proto._icon = '';
    proto._is_window  = 0;
    proto._is_waiting = 0;

    /* Actions attributes: */
    proto._delta = { x : 0, y : 0 };

    /* List of opened window layers: */
    proto._windows_layers = []; // for e.g. [obj1, obj2, .. obj5]

    /* List of opened windows: */
    proto._windows_opened = [];

    /* List of window groups(only group length): */
    proto._windows_groups = []; // for e.g. group id=0, length=3

    /* 
       P.S.: I think, it isn't a good idea to use a real private
       methods or attributes in js, so i don't do it consciously;
    */



/****************************
 * Some helpfull functions: 
**/


    var _is_touchscreen = false;

    var log = function (message) {
        if (! debug) return false;
        console.log(message);
    }


    var hasClass = function (elem, className) {
        return new RegExp("(^|\\s)"+className+"(\\s|$)").test(elem.className)
    }


    proto._show_hide_windows_by_timeout = function (timeout) {
        if (this._show_hide_windows_by_timeout_started) return false;

        this._show_hide_windows_by_timeout_started = 1;
//log('Show and hide windows on wrapper: '+this._divwrapper );

        for (var i=0; i<this._windows_opened.length; i++) {
            var w  = this._windows_opened[i];
//log('Test for window: '+w.id );
            if (w._is_closed) continue;

            var we = w.get_elem().style;
//log('Style for window: '+we.display + ' ~ hidden: ' + w._is_hidden );
            if ( w._is_hidden && we.display != 'none' ) 
                we.display = 'none';
            else if (! w._is_hidden && we.display != 'block' ) 
                we.display = 'block';
        }
        this._show_hide_windows_by_timeout_started = 0;

        var this_ = this;
        setTimeout(function() {
            this_._show_hide_windows_by_timeout(timeout);
        }, timeout);

        return true;
    }


    var add_event_listener = function (elem, event, callback) {
        elem[event] = callback;
    
        /* Opera or Firefox: */
        if (browsers[1] || browsers[2]) {  
            //elem.addEventListener = (
            //    event, callback, false
            //);
        }
    }


    /* Test for mouse longClick on elem: */
    proto._longClick = function (elem, kevent, short_click, long_click, timeout) {
        // short_click - short click callback
        // long_click  - long  click callback
        // timeout     - long click timeout

        if (!timeout) timeuot = 100; // 0.1 sec by default
        
log('Setting longClick timeout...');
        var sevent = 'onmouseup';
        //if (_is_touchscreen) sevent = 'ontouchend';
            
        /* Call long_callback after `timeout' sec: */
        var click_timeout = setTimeout( function() {
            add_event_listener( elem, sevent );
log('Is longClick!!!');
            if (typeof long_click == 'function') long_click();
        }, 100);


        /* On simple Click - call short_callback: */
        add_event_listener( elem, sevent,
            function(kevent) {
log('Is shortClick! Clearing longClick timeout...');
                clearTimeout(click_timeout);
                add_event_listener( elem, sevent );
                if (typeof short_click == 'function') short_click();
        });

    };


    var parentOffsetPosition = function ( element ) {
        element = element.offsetParent;
        if (! element) return false;
        var offsetLeft = 0, offsetTop = 0;
        do {
            offsetLeft += element.offsetLeft;
            offsetTop  += element.offsetTop;
        }    while ( element = element.offsetParent );
        return [ offsetLeft, offsetTop];
    };

    var getElemLeft = function (elem) {
        return elem.getBoundingClientRect().left;
    };

    var getElemTop = function (elem) {
        return elem.getBoundingClientRect().top;
    };


    var getElemWidth = function (elem) {
        var br = elem.getBoundingClientRect();
        var w  = br.right - br.left;
        return w;
    };
       

    var getPageScroll = (window.pageXOffset != undefined) ?
        function() {
            return {
                left: pageXOffset,
                top: pageYOffset
            };
        } :
        function() {
            var html = document.documentElement;
            var body = document.body;
 
            var top = html.scrollTop || body && body.scrollTop || 0;
            top -= html.clientTop;
            var left = html.scrollLeft || body && body.scrollLeft || 0;
            left -= html.clientLeft;
 
            return { top: top, left: left };
    };



    var throttle = function (f, ms) {
        /* one of three states: */
        var state = null;
        var COOLDOWN = 1;        // func called, wait for timeout 
        var CALL_SCHEDULED = 2;  // called while COOLDOWN, execute after timeout;

        /* Save `this' and arg. functions: */
        var scheduledThis, scheduledArgs;
        function callF() {
            f.apply(scheduledThis, scheduledArgs);
        }

        /* 
          Turn between states:
          firstly: null, but call func and turn to COOLDOWN
          if while COOLDOWN, turn to CALL_SCHEDULED with args. saving
          if while CALL_SCHEDULED, - replace arguments
        */
        return function() {
            switch(state) {
                case null:
                    f.apply(this, arguments);
                    state = COOLDOWN;
                    setTimeout(later, ms);
                    break;

                case COOLDOWN:
                case CALL_SCHEDULED:        
                    scheduledThis = this;
                    scheduledArgs = arguments;

                    state = CALL_SCHEDULED;
                    break;
            }
        }

        function later() {
            if (state == COOLDOWN) {
                state = null;
                return;
            }

            if (state == CALL_SCHEDULED) {
                callF();
                /* after execute turn state to COOLDOWN: */
                state = COOLDOWN; 
                setTimeout(later, ms);
            }
        }
    };



    var increaseOpacity = function ( elem, callback, speed, opacity ) {
        if (!speed) speed = 30;
        if (!opacity) opacity = 0;
        if (opacity >= 1 && callback) return callback();
        if (opacity >= 1) {
            opacity = 1;
            return true;
        }
        opacity += 0.1;
        elem.style.opacity = opacity;
        setTimeout( function () { 
            increaseOpacity(elem, callback, speed, opacity)
        }, speed );
    }

    var decreaseOpacity = function ( elem, callback, speed, opacity ) {
        if (!speed) speed = 30;
        if (!opacity) opacity = 1;
        if (opacity <= 0 && callback) return callback();
        if (opacity <= 0) {
            opacity = 0;
            return true;
        }
        opacity -= 0.1;
        elem.style.opacity = opacity;     
        setTimeout( function () {
            decreaseOpacity(elem, callback, speed, opacity)
        }, speed );
    }


    /* Gets a window from an element: (c) John Resig */
    var getWindow = function ( elem ) {
        return (elem != null && elem == elem.window) ?
            elem :
            elem.nodeType === 9 ?
                elem.defaultView || elem.parentWindow :
                false;
    };






/****************************
 * Public methods:
**/


    /* Create new window: */
    proto['make'] = function( params ) {
        if (! params) params = {};

        /* Too many windows opened! */
        if ( this._windows_opened.length >= maxwindows )
            return 0;

        /* Get window by ident: */
        if (params['ident']) {
            var wWt = this.get_by_ident(params['ident']);

            /* Window with same ident allready exist, */
            if (! params['dont_setontop'] && wWt )
                wWt.ontop();

            /* existent == True: return existent object; */
            if ( params['existent'] && wWt )
                return wWt;
            if ( wWt ) return 0;
        }

        /* Create new instance: */
        var wW = function () {};

        /* Inherit from parent: */
        wW.prototype = this;
        var ww = new wW();

        ww['onclose_all'] = 0; // On close - close all childrens;
        scroll = getPageScroll();
        ww['top']      = scroll.top + 10 + Math.random() * (250 - 50);
        ww['left']     = scroll.left + 10 + Math.random() * (350 - 100);

        ww._is_window  = 1;
        ww._is_closed  = 0;
        ww._is_hidden  = 0;
        ww._childs  = [];         // Childs of this window
        ww._tabs    = {};         // Tabs of this window
        ww._max_tab = 0;
        ww._act_tab = 0;          // Active tab

        /* Save parent window object: */
        ww._parent   = 0; 

        /* Window - a tab of other window: */
        ww._a_tab_of = 0; 
        ww._a_tab_of__tid = 0;

        if ( this._is_window ) {
            ww._parent = this; 
            this._childs.push(ww);
        }

        for(var i in ww) {
            if (params[i] != undefined) ww[i] = params[i];
        }

        /* Only changed object properties: */
        /*
        for(var i in ww) {
            if (!ww.hasOwnProperty(i)) continue;
            alert(i + ' ~ ' + ww[i]);
        }
        */

        /* Save window object: */
        this._windows_opened.push(ww);
        ww['id'] = max_opened_window_id;
        max_opened_window_id += 1;

        /* Set up new layer for this window: */
        ww._layer = this._windows_layers.length;
        this._windows_layers[ww._layer] = ww;
        
        /* Drow window: */
        proto['style_class'] = style_class + this['style'];
        ww._draw();

        /* Prepare window: */
        ww._prepare();


        return ww;
    };
    proto.make = proto['make'];



        
    /* Search window by ident: */
    proto['get_by_ident'] = function(ident) {
        for (var i=0; i<this._windows_opened.length; i++)
            if ( this._windows_opened[i]['ident'] == ident )
                return this._windows_opened[i];
    };
    proto.get_by_ident = proto['get_by_ident'];



    /* Returns ID of DOM element of window: */
    proto['get_elem_id'] = function () {
        return window_dom_id + this['id'];
    };
    proto.get_elem_id = proto['get_elem_id'];
        
        
            
    /* Returns DOM window object: */
    proto['get_elem'] = function (id) {
        if (! id) id = this.get_elem_id();
        elem = document.getElementById( id );
        if (! elem)
            throw new Error("Cant find DOM element: "+id);
        return elem;
    };
    proto.get_elem = proto['get_elem'];
        

    /* Returns DOM window object: */
    proto['get_subelem'] = function (sub) {
        var id = this.get_elem_id() + sub;
        return this.get_elem(id);
    };
    proto.get_subelem = proto['get_subelem'];

        






/*
 * Setting `dinamic' attributes part:
**/


    /* Set window title: */
    proto['set_title'] = function (newtitle) {
        var elem = this.get_subelem('_title_tab0');
        if (this._a_tab_of)
            elem = this._a_tab_of.get_subelem('_title_tab' + this._a_tab_of__tid);

        elem.innerHTML = newtitle;
        this._restyle();
    };
    proto.set_title = proto['set_title'];


        
    /* Set window content: */
    proto['set_content'] = function (newcontent) {
        this.get_content_elem();
        elem.innerHTML = newcontent;
    };
    proto.set_content = proto['set_content'];


    
    /* Set window content with phrase template: */
    proto['set_content_tpl'] = function (line, color) {
        var tagline = '<div style="margin: 0 auto; ';
        tagline += 'text-align: center;">';
        if (color)
            line = '<font color="' + color + '">' + line + '</font>';
        tagline += line;
        tagline += '</div>';
        this.set_content(tagline);
    };
    proto.set_content_tpl = proto['set_content_tpl'];



    /* Get window content elem: */
    proto['get_content_elem'] = function () {
        var elem = this.get_subelem('_tabs_tab0');
        if (this._a_tab_of)
            elem = this._a_tab_of.get_subelem('_tabs_tab' + this._a_tab_of__tid);

        return elem.getElementsByTagName('div')[0]
    };
    proto.get_content_elem = proto['get_content_elem'];





/*
 * Window flags part:
**/


    /* Set window can be maximized: */
    proto['set_can_maximize'] = function (flag) {
        this._set_attr_for_block('_button_maximize', 
            'can_maximize', flag
        );
    };


    /* Set window can be minimized: */
    proto['set_can_minimize'] = function (flag) {
        this._set_attr_for_block('_button_minimize',
            'can_minimize', flag
        );
    };



    /* Set window can be fixed: */
    proto['set_can_fix'] = function (flag) {
        this._set_attr_for_block('_button_fix',
            'can_fix', flag
        );
    };



    /* Set window can be closed: */
    proto['set_closeable'] = function (flag) {
        this._set_attr_for_block('_button_close',
            'closeable', flag
        );
    };

    /* Set window resizable: */
    proto['set_resizable'] = function (flag) {
        this._set_attr_for_block('_button_resize',
            '_resizable', flag
        );
    };




/*
 * Window actions part:
**/



    /* Set window icon: */
    proto['set_icon'] = function (iconurl) {
        var elem = this.get_subelem('_icon');
        if (iconurl) {
            this._icon = iconurl;
            elem.style.backgroundImage = 'url(' + iconurl + ')';
            //elem.style.visibility='visible';
            elem.style.display='block';
            this._restyle();

        } else {
            elem.style.display='none';
            this._restyle();
        }
    };

    /* Show waiting bar over content: */
    proto['wait'] = function (flag, local_use) {
        var elem = this.get_subelem( '_fader' );

        if ( flag ) {
            elem.style.display='block';
            if (!local_use) this._is_waiting = 1;
        } else {
            elem.style.display='none';
            if (!local_use) this._is_waiting = 0;
        }


        /* If window is a tab, show 'wait' for tabs window: */
        if (this._a_tab_of) 
            if (this._a_tab_of._act_tab == this._a_tab_of__tid) 
                this._a_tab_of.wait(flag, 1);


    };
    proto.wait = proto['wait'];


    /* Minimize window: */
    proto['minimize'] = function () {
        if ( this['can_minimize'] && ! this._is_minimized ) {
            this.set_size( window_minwidth, window_minheight, 1 );
            this._is_minimized = 1;
            this._is_maximized = 0;
            this._restyle();
        } else if ( this['can_minimize'] && this._is_minimized ) {
            this.set_size( this.width, this.height, 1 );
            this._is_minimized = 0;
        }
    };
    proto.minimize = proto['minimize'];


    /* Maximize window: */
    proto['maximize'] = function () {
        function getClientWidth() {
            return document.compatMode=='CSS1Compat' &&
            !window.opera?document.documentElement.clientWidth:document.body.clientWidth;
        }

        function getClientHeight() {
            return document.compatMode=='CSS1Compat' &&
            !window.opera?document.documentElement.clientHeight:document.body.clientHeight;
        }

        if ( this['can_maximize'] && ! this._is_maximized ) {
            this.set_size( getClientWidth(), getClientHeight(), 1 );
            this.get_elem().style.position = 'fixed';
            this.set_position(0, 0, 1);
            this._is_minimized = 0;
            this._is_maximized = 1;
            this._restyle();
        } else if ( this['can_maximize'] && this._is_maximized ) {
            this.set_size( this.width, this.height, 1 );
            if ( ! this._is_fixed )
                this.get_elem().style.position = 'absolute';
            this.set_position(this.left, this.top, 1);
            this._is_maximized = 0;
        }
    };
    proto.maximize = proto['maximize'];


    /* Fix window: */
    proto['fix'] = function () {

        /* Some helpfull functions: */


        /* By default returns scrollTop: (c) John Resig */
        getScroll = function( method, elem ) {
            var prop = 'pageYOffset';
            if (method == 'scrollLeft') prop = pageXOffset;
            var win = getWindow( elem );

            return win ? (prop in win) ? win[ prop ] :
                win.document.documentElement[ method ] :
                elem[ method ];
        };

        //var s_top  = $(document).scrollTop();
        //var s_left = $(document).scrollLeft();
        var s_top    = getScroll('scrollTop', document);
        var s_left   = getScroll('scrollLeft', document);
        var x_offset = this.get_elem().offsetLeft;
        var y_offset = this.get_elem().offsetTop;

        if ( this['can_fix'] && ! this._is_fixed ) {
            var p_offset = parentOffsetPosition( this.get_elem() );
            this.get_elem().style.position = 'fixed';
            this._is_fixed = 1;
            x_offset += p_offset[0];
            y_offset += p_offset[1];
            this.set_position(x_offset - s_left, y_offset - s_top);
        } else if ( this['can_fix'] && this._is_fixed ) {
            this.get_elem().style.position = 'absolute';
            this._is_fixed = 0;
            var p_offset = parentOffsetPosition( this.get_elem() );
            x_offset -= p_offset[0];
            y_offset -= p_offset[1];
            this.set_position(x_offset + s_left, y_offset + s_top);
        }
    };
    proto.fix = proto['fix'];


    /* Show hidden window: */
    proto['show'] = function () {
        if ( ! this._is_hidden ) return 0;
        this.ontop();

        /* Show element: */

        var elem = this.get_elem();
        if (this.window_show_time) {
            elem.style.opacity = 0;
            elem.style.display = 'block';
            increaseOpacity(elem, 0, this.window_show_time );
        } else elem.style.display = 'block';

        this._is_hidden = 0;

    };
    proto.show = proto['show'];



    /* Hide window: */
    proto['hide'] = function () {
        if ( this._is_hidden ) return 0;

        /* Set layer to bottom of layers: */
        var id = this._layer_onbottom();

        /* Fix z-indexes: */
        for (var i=0; i<=id; i++) {
            this._windows_layers[i].set_active();
            this._windows_layers[i]._restyle();
        }


        /* Check, if layer was on top: */
        if (id + 1 == this._windows_layers.length) {
            /* Set active next window: */
            this._windows_layers[id].set_active(1);
            this._windows_layers[id]._restyle();
        }

        /* Hide element: */
        var elem = this.get_elem();
        if (this.window_hide_time)
            decreaseOpacity(elem, function() {
                elem.style.display = 'none';
            }, this.window_hide_time );
        else elem.style.display = 'none';

        this._is_hidden = 1;
    };
    proto.hide = proto['hide'];





    /* Close `this' window and all childs: */
    proto['close_all'] = function ( close_anyway ) {
        this.close_allchilds( close_anyway );
        this.close( close_anyway );
    };
    proto.close_all = proto['close_all'];


    /* Close all childs: */
    proto['close_allchilds'] = function ( close_anyway ) {
        var childs = this._childs;
        for (i=0; i < childs.length; i++) {
            childs[i].close( close_anyway );
        }
    };
    proto.close_allchilds = proto['close_allchilds'];



    /* Closing window: */
    proto['close'] = function ( close_anyway ) {
        if (! this['closeable'] ) return 0;
        if ( this._is_closed ) return 0;


        if (! close_anyway && this.hide_on_close ) 
            return this.hide()

        /* Close all childrens on this flag: */
        if ( this['onclose_all'] ) {
            this.close_allchilds( close_anyway );
        }

        /* Low all top layers: */
        this.ontop();

        /* Remove from group: */
        this._layer_ungroup();

        /* Remove from parent: */
        if ( this._parent ) {
            var pchilds = this._parent._childs;
            for (i=0; i < pchilds.length; i++) 
                if ( pchilds[i] == this ) {
                    this._parent._childs.splice(i, 1);
                    break;
                }
        }

        /* Remove from childs: */
        if ( this._childs ) {
            var childs = this._childs;
            for (i=0; i < childs.length; i++) 
                childs[i]._parent = 0;
        }





        /* Allready closed by child: */
        if ( this._is_closed ) return 0;

        /* Close all tabs: */
        var mytabs = Object.keys( this._tabs );
        if ( mytabs.length > 1  ) {
            for (var i=0; i<mytabs.length; i++) {
                var tab = this._tabs[mytabs[i]];
                /* Skip myself: */
                if (tab == this) continue;
                if ( tab._is_closed ) continue;
                tab.close();
            }
        }
        if ( this._is_closed ) return 0;

        /* Close opened tab: */
        if ( this._a_tab_of ) {
log('Closing window: '+this.id+ ' as tab: ' + this._a_tab_of__tid );
            this._a_tab_of._close_tab(this._a_tab_of__tid);
            /* Clear tab parametrs: */
            this._a_tab_of = 0; 
            this._a_tab_of__tid = 0;
        }


        /* Allready closed by child: */
        if ( this._is_closed ) return 0;
log('Closing window: '+this.id );
        this._is_closed = 1;

        var helem = this.get_elem();
        var wrapper = this.get_elem( this._divwrapper );

        if (this.window_hide_time) 
            decreaseOpacity(helem, function() {
                wrapper.removeChild( helem );
            }, this.window_hide_time );
        else wrapper.removeChild( helem );


        /* Remove from layers: */
        var layer = this._layer;
        this._windows_layers.splice(layer, 1);
    
        /* Remove from opened windows: */
        for (var i=0; i<this._windows_opened.length; i++)
            if (this._windows_opened[i] == this) {
                this._windows_opened.splice(i, 1);
                break;
            }

        /* Set active next window: */
        var id = this._windows_layers.length - 1;
        if ( id >= 0 )
            this._windows_layers[id].set_active(1);

        //delete this;
    };
    proto.close = proto['close'];





    /* Set window on the top layer: */
    proto['ontop'] = function(tab_id) {
        if (!tab_id) tab_id = 0;
        var layer = this._layer;
log('Ontop window: ' + this.id );

        /* Move layers first: */
        this._layer_ontop();

        /* Fix z-indexes: */
        for (var i=layer;i<this._windows_layers.length;i++) {
            this._windows_layers[i].set_active();
            this._windows_layers[i]._restyle_clear();
        }

        /* If window is a tab of other window, active other window: */
        if (this._a_tab_of) {
log('This is a tab of: ' + this._a_tab_of.id );
log('Active tab is: ' + this._a_tab_of._act_tab + ' != ' + this._a_tab_of__tid );
            this._a_tab_of.ontop();

            /* Make tab active: */
            if (this._a_tab_of._act_tab != this._a_tab_of__tid) 
                this._a_tab_of.set_active_tab(this._a_tab_of__tid);

        } else {
            this.set_active_tab(tab_id);
            this.set_active(1);
            this._restyle();
        }

    };
    proto.ontop = proto['ontop'];





    /* Set window position: */
    proto['set_position'] = function (left, top, flag) {
        if ( this._is_closed ) return 0;
        if (! flag && ! this._is_maximized) {
                this.top    = top;
                this.left   = left;
        }
        this.get_elem().style.top  = top+'px';
        this.get_elem().style.left = left+'px';
    };
    proto.set_position = proto['set_position'];



    /* Resize window: */
    proto['set_size'] = function (width, height, flag) {
        if ( this._is_closed ) return 0;
        if (!flag) {
                this.width  = width;
                this.height = height;
        }
        this.get_elem().style.width  = width + 'px';
        this.get_elem().style.height = height + 'px';
    
        /* Setting content height: */
        var set_height = function(elem) {
            var h = height - header_height -8;
            elem.style.height = h + 'px';
        }

        set_height( this.get_subelem( '_body' ) );
        set_height( this.get_subelem( '_tabs' ) );
    };
    proto.set_size = proto['set_size'];



    /* Set window isActive or not isActive: */
    proto['set_active'] = function (active) {
        if ( this._is_closed ) return 0;
        var active_cls   = this['style_class'] + '_header_active';
        var elem = this.get_subelem( '_header' );
        
        /* Set active class for window: */
        if ( active ) {
                this.__dom_add_class(elem, active_cls);

        /* Inactive window: */
        } else {
                this.__dom_del_class(elem, active_cls);
        }
    };
    proto.set_active = proto['set_active'];




    /* Find window ident by DIV element: */
    proto['find_ident'] = function (elem) {
        if (!elem) return null;
        
        try { 
            var first_child = elem.getElementsByTagName('div')[0];
        } catch (exception) {
            log('Search for elem faild!');
            return null;
        }
        log('Search for elem: ' + elem.id + ' ' + elem);
        
        // Search in parent class:
        if (!first_child || !hasClass(first_child, hidden_ident_class))
            return this.find_ident(elem.parentNode);
            
        // Ident found!
        log('Elem Found: ' + first_child.innerHTML);
        return first_child.innerHTML;
    };
    proto.find_ident = proto['find_ident'];
    
        
          
    /* Find window instance by DIV element: */
    proto['find_by_elem'] = function (elem) {
        var ident = this.find_ident(elem);
        log('Search result: ' + ident);
        if (!ident) return null;
        log('Search result2: ' + ident);
        
        // Found wW in div wrappers:
        var divs = Object.keys( divwrappers );
        for (var i=0; i<divs.length; i++) {
            log('Search for instance of: ' + ident + ' in wrapper: ' + divs[i]);
            var w = divwrappers[divs[i]]['get_by_ident'](ident);
            if (w)
                return w;
        }
    };







    /* Set active tab: */
    proto['set_active_tab'] = function(tid, deactive) {
        var tab;
        try {
            tab = this.get_subelem('_tabs_tab'+this._act_tab);
            tab.style.display = 'none';

            tab = this.get_subelem('_title_tab'+this._act_tab);
            var sclass = this['style_class'];
            var iclass = sclass;
            if ( this['ident'] ) iclass += '_' + this['ident'];

            var sstyle = sclass+'_title_tab_active';
            var istyle = iclass+'_title_tab_active';
            this.__dom_del_class(tab, sstyle, istyle);
        } catch(e) {
        } finally {
        } 

        if (deactive) tid = 0;

        log('Setting active tab: ' + tid);
        this._act_tab = tid;

        try {
            tab = this.get_subelem('_tabs_tab'+this._act_tab);
            tab.style.display = 'block';

            /* Test for wait status: */
            if (this._tabs[tid]._is_waiting) this.wait(true, 1);
            else this.wait(false, 1);
        } catch(e) {
        } finally {
        } 
 


        /* More than one tab: */
        if (Object.keys( this._tabs ).length > 1) {
            tab = this.get_subelem('_title_tab'+this._act_tab);
            this.__dom_add_class(tab, sstyle, istyle);
        }
    }
    proto.set_active_tab = proto['set_active_tab'];


    /* Set deactive tab: */
    proto['set_deactive_tab'] = function() {
        /* Deactive tab: */
        this.set_active_tab(0, 1);
    }
    proto.set_deactive_tab = proto['set_deactive_tab'];



    /* Close tab: */
    proto['close_tab'] = function(tid) {
        var elem = this._tabs[tid];

        /* Just close object' window, it close tab: */
        elem.close();
    }
    proto.close_tab = proto['close_tab'];








/****************************          
 * Private methods:
**/

    var lastX, lastY;
    var vectX, vectY;

    /* Set window private attribute: (block element)*/
    proto._set_attr_for_block = function (elem, attr, flag) {
        elem = this.get_subelem( elem );
        if (! flag && this[attr] ) {
            elem.style.display='none';
            this[attr] = 0;
            this._restyle();
        } else if ( flag && ! this[attr] ) {
            elem.style.display='block';
            this[attr] = 1;
            this._restyle();
        }
    };








/*  
 * Window tabs part:
**/ 

    /* Create new tab: */
    proto._create_tab = function(elem) {
        var tid = this._max_tab;
        this._max_tab += 1;
        this._tabs[tid] = elem;
log('Creating tab: ' + tid + ' win: ' + elem.id);
        tab_candidate.tid = tid;
        var title_tabdiv = this._create_tab_title(tid);
        return title_tabdiv;
    };


    /* Main tabs timeout checker: */
    var main_check_timeout_enabled = false;
    function main_check_timeout(callback, timeout) {

        /* Exit, if allready runned: */
        if ( main_check_timeout_enabled ) return false;
        main_check_timeout_enabled = true;
        if (!timeout) timeout = 250;

        setTimeout(function () {
//log('Timeout is Up');
            callback();
            main_check_timeout_enabled = false;
        }, timeout);
        return true;
    }




    proto._start_tab_moving = function (kevent, tid, _ontouch) {
        if ( this._is_closed ) return 0;

        /* Move by touchscreen: */
        if (_ontouch) {
            if (kevent.touches.length != 1) return 0;
            kevent.preventDefault();
        }

        kevent = get_kevent(kevent);
        if (kevent.stopPropagation) 
            kevent.stopPropagation();  
        else kevent.cancelBubble = true;


        /* Set tab candidate: */
        var src = this._tabs[tid];
        src._set_tab_candidate(this, tid, _ontouch);

        var _this = this;
        var sevent = _ontouch ? 'ontouchmove' : 'onmousemove';
        var selem  = _ontouch ? this.get_subelem('_title_tab_abs') : document;

        add_event_listener( selem, sevent,
            function(kevent) { 
                kevent = get_kevent(kevent);
                if (kevent.stopPropagation) 
                    kevent.stopPropagation();
                else kevent.cancelBubble = true;
                _this._remove_selection();
                _this._move_tab(kevent, _ontouch);
                _this._remove_selection();
        });
    };

    proto._stop_tab_moving = function (kevent) {
        if ( this._is_closed ) return 0;
        this._clear_tab_candidate();
    }

    /* 
       Check, if window on another window can be new tab: 
       Called by proto._move_window;
    */

    proto._can_be_tab_of = function (elem) {
        var tabslen = Object.keys( this._tabs ).length;
        if (tabslen > 1) return;

        /* Can't be a tab: */
        if (! this['can_be_tab']) return;
        if (! elem['can_have_tabs']) return;


        /* Window is allready a tab: */
        if (elem._a_tab_of) return; 

        /* Another window or tab is active! */
        if (tab_candidate) return;

        /* If can be a new tab, make tab: */
        if ( this._add_to_tab_check(elem) ) {

log('Window ' + this['id'] + ' can be a tab of: ' + elem['id']);
            /* Prepare new tab, change event: */
            this._set_tab_candidate(elem);

        }
    };



    proto._move_tab = function (event, _ontouch) {
        if ( this._is_closed ) return 0;

        /* Moving by touchscreen: */
        if (_ontouch) {
            //if (event.touches.length != 1) return 0;
            event.preventDefault();
        }

        kevent = get_kevent(event);
        var coords = this._get_x_y(kevent);
        
        var new_x = this._delta.x + coords[0];
        var new_y = this._delta.y + coords[1];
        
        if (new_y < 0) new_y = 0;

        //lastX = kevent.clientX;
        //lastY = kevent.clientY;

        /* Tab is out of window, remove tab; */
        if ( tab_candidate.tid > 0 ) { // Not a first tab!
            var _this = this;
            if ( main_check_timeout(function() {}) ) {
                if (! tab_candidate ) return false;
                if (! _this._add_to_tab_check(_this, 1) ) {
log('Move tab: Removing to window... ' + tab_candidate.tid);
                    /* Remove tab back to window: */
                    _this._remove_tab_to_window();

                    //if (_ontouch) {
                    //    tab_candidate.src._start_window_moving_by_touchscreen(event);
                    //    tab_candidate.src._move_window_by_touchscreen(event);
                    //}

                }
            } 
        }


        this._tab_set_position(new_x, new_y);
    };





/*
 * Window tabs actions part:
**/



    /* Test for mouse longclick on tab: */
    proto._tab_longclick = function (kevent, tid, _ontouch) {

        titletab = this.get_subelem( '_title_tab'+tid );
        var _this = this;
log('Setting tab timeout...');
        _this.set_active_tab(tid);

        this._longClick (titletab, kevent, 0, function() {
            /* Move tab after 0.1 sec: */
            _this._start_tab_moving(kevent, tid, _ontouch);

        }, 100);

    };




    /* Tab candidate setting: */
    proto._set_tab_candidate = function (toelemobj, tid) {
        if ( tab_candidate ) return 0

log('Setting up tab candidate...');
        /* Show absolute tab: */
        var abs_elem = toelemobj.get_subelem( '_title_tab_abs' );
        abs_elem.innerHTML = ''; // Clear absolute tab;
        abs_elem.style.opacity=0;
        abs_elem.style.display='block';
        increaseOpacity(abs_elem, 0, 20);

        /* Set tab_candidate: */
        tab_candidate = { src: this, dst: toelemobj };

        var titletab = 0; // moving(new) title tab

        /* If tid is defined, get existing tab: */
        if (tid != undefined) {
            titletab = toelemobj.get_subelem( '_title_tab'+tid );
            tab_candidate.tid = tid;
            titletab.style.visibility = 'hidden';

        /* Create new tab as invisible: */
        } else {
            titletab = toelemobj._create_tab(this);
            
            /* Copy title to tab: */
            var title = this.get_subelem( '_title' );
            title = title.getElementsByTagName('div')[1];
            titletab.innerHTML = title.innerHTML;

            /* Move content to the new tab: */
            this._add_to_tab__move_content(toelemobj);

        }
             
        /* Copy title to absolute tab: */
        abs_elem.innerHTML = titletab.innerHTML;
        abs_elem.style.left  = titletab.offsetLeft;
        abs_elem.style.width = getElemWidth(titletab);

        /* Set event to tab move: */
        var sevent = _is_touchscreen ? 'ontouchmove' : 'onmousemove';
        var selem  = _is_touchscreen ? abs_elem : document;
        //add_event_listener( document, 'onmousemove',
        add_event_listener( selem, sevent,
            function(kevent) {
                toelemobj._remove_selection();
                toelemobj._move_tab(kevent, _is_touchscreen);
                toelemobj._remove_selection();
        });

        if (_is_touchscreen)
        add_event_listener( abs_elem, 'ontouchend', function(kevent) {
            toelemobj._stop_tab_moving(kevent);
            add_event_listener( abs_elem, 'ontouchend' );
        });




    }

    /* Check, may be we can attach to tabs? : */
    proto._add_to_tab_check = function (toelemobj, by_mouse) {
        if (! toelemobj) return false;

        var toelem = toelemobj.get_elem();

        var x=lastX;
        var y=lastY;
        var y1 = parseInt(getElemTop(this.get_elem()));
        if (by_mouse) y1 = y;

        var h1 = parseInt(getElemTop(toelem));
        var h2 = h1 + parseInt(toelem.clientHeight);
        var w1 = parseInt(getElemLeft(toelem));
        var w2 = w1 + parseInt(getElemWidth(toelem));

        var ht = h1 + header_height;
        if ( x > w2 - 48 ) return false;
        if ( y1 > ht + 5 ) return false;
        if ( y1 < h1 - 5 ) return false;
        return true;
    }



    /* Check, may be we can attach to tabs? : */
    proto._tab_set_position = function (new_x, new_y) {

        /* Show newtab DIV: */
        var abs_elem = this.get_subelem('_title_tab_abs');
        var xl = getElemLeft(abs_elem.parentNode);
        var x = lastX - xl;
        var wd = parseInt(abs_elem.clientWidth)/2 || 0;
        x -= wd;

        /* Set Absolute tab position: */
        if (x < 0) x = 0;
        abs_elem.style.left=x + 'px';

        /* Move title tabs left or right: */
        if ( tab_candidate ) {
            var ar = abs_elem.getBoundingClientRect();
            var ntab_elem = this.get_subelem('_title_tab'+tab_candidate.tid);

            var tabs = Object.keys( this._tabs );
            for (var i=0; i<tabs.length; i++) {
                var tid = tabs[i];
                var id = this.get_elem_id() + '_title_tab';
                id += tid;
                var tab_elem = this.get_elem(id);
                if (!tab_elem) continue;
                if ( tab_elem.id == ntab_elem.id ) continue;
                var br=tab_elem.getBoundingClientRect();
                wd = br.right - br.left;

                /* Move left: */
                if (ar.left < br.right - wd/2 && ar.left > br.left && ar.right > br.right ) 
                    this._tab_title_swap(tab_elem, ntab_elem);
                /* Move right: */
                else if (ar.right > br.left + wd/2 && ar.right < br.right && ar.left < br.left ) 
                    this._tab_title_swap(ntab_elem, tab_elem);
            }
        }
        

        return true;
        
    };



    /* On tab attaching: move in content: */
    proto._add_to_tab__move_content = function (toelemobj) {
        if (! toelemobj) return false;

        var content = this.get_subelem('_tabs_tab0');
        var contdiv = content.getElementsByTagName('div')[0];

        /* New Window tab DIV: */
        id = toelemobj.get_elem_id() + '_tabs_tab';
        id += tab_candidate.tid;
        var ntab = this.__dom_create_element('div', {}, id);

        /* Hide window: */
        this.hide();
log('Window is hide now...');

        /* Save tab param in tab object: */
        this._a_tab_of = toelemobj;
        this._a_tab_of__tid = tab_candidate.tid;
        toelemobj.ontop();

        /* Moving content: */
        content.removeChild( contdiv );
        ntab.appendChild( contdiv );

        var tabs = toelemobj.get_subelem('_tabs');
        tabs.appendChild( ntab );
        toelemobj.set_active_tab(tab_candidate.tid);
    }


    proto._remove_tab_to_window = function () {
        var dst = tab_candidate.dst;
        var src = tab_candidate.src;

log('Start removing content...');
        dst.set_active_tab(0);
        src._del_tab__move_content();
    };





    /* Close tab: */
    proto._close_tab = function (tid) {

        /* Inactive active any tab: */
        this.set_deactive_tab();

        /* Get cotent from tab DIV: */
        var tab = this.get_subelem('_tabs_tab'+tid);
        var tabs = tab.parentNode;
log('Closing tab' + tid + ' content...');
        tabs.removeChild( tab );

        if (tab_candidate.tid == tid) {
            /* Clear tab candidate: */
            this._clear_tab_candidate(0);

        }

        /* Remove tab title from DOM: */
        titletab = this.get_subelem('_title_tab'+tid);
        title = titletab.parentNode;
        title.removeChild(titletab);
log('Move tab' + tid + ': Removed from DOM...');
        
        /* Remove tab from tabs array: */
        delete this._tabs[tid];
        this._restyle_tabs();

        return tab;
    };



                    
    /* On tab removing: move out content: */
    proto._del_tab__move_content = function () {
        var toelemobj = tab_candidate.dst;

log('Moving content...');

        /* Close tab and get DIV object:: */
        var tab = toelemobj._close_tab(tab_candidate.tid);
        var contdiv = tab.getElementsByTagName('div')[0];

        /* Move content: */
        var content = this.get_subelem('_tabs_tab0');
        content.appendChild( contdiv );

        this._a_tab_of = 0;
        this._a_tab_of__tid = 0;

        /* Show window: */
        this.show();

        /* Set window position: */
        var coords = this._get_x_y();
        var wd = parseInt(getElemWidth(this.get_elem()));
        var scroll = getPageScroll();
        this._delta.x = -1 * wd/2 + scroll.left;
        this._delta.y = -10 + scroll.top;
        
        var new_x = this._delta.x + coords[0];
        var new_y = this._delta.y + coords[1];
log('X: ' + new_x + '; Y: ' + new_y);
log('ScrollX/Y: ' + scroll.left + '/' + scroll.top);
        this.set_position(new_x, new_y);

log('Window showd!');




        /* Reinit mousemove events: */
        var _this = this;
        add_event_listener( document, 'onmousemove',
            function(kevent) {
                _this._remove_selection();
                _this._move_window(kevent);
                _this._remove_selection();
        });

    }





    proto._clear_tab_candidate = function( flag ) {
        if (! tab_candidate ) return 0;

        /* 
           If src window is hidden(or flag == 1) 
           - set title tab as visible: 
        */
        if ( flag == undefined && tab_candidate.tid == 0 ) 
            flag = 1;

        if ( flag == undefined ) 
            flag = tab_candidate.src._is_hidden;


        if ( flag ) {
            /* Get Title TAB DIV: */
            id = tab_candidate.dst.get_elem_id() + '_title_tab';
            id += tab_candidate.tid;
            var titletab = this.get_elem(id);
            titletab.style.visibility = 'visible';
        }


        /* Hide absolute title tab: */
        var id = tab_candidate.dst.get_elem_id() + '_title_tab_abs';
        var abs_elem = this.get_elem(id);

        decreaseOpacity(abs_elem, function() {
            abs_elem.style.display='none';
            abs_elem.style.opacity=1;
        }, 20 );

        tab_candidate.dst._restyle_tabs();

        tab_candidate = 0;
    }





    /* Create tab_title DIV: */
    proto._create_tab_title = function(tab_id) {
        if (!tab_id) tab_id = 0;

        /* Name of CSS class, and subclasses: ( e.g. ..._title ) */
        var sclass = this['style_class'];
        
        /* Persional Ident class: */
        var iclass = sclass;
        if ( this['ident'] ) iclass += '_' + this['ident'];

        /* Get Title TAB DIV: */
        var title = this.get_subelem('_title');

        /* Add tab to title: */
        var tabname = '_title_tab';
        var id = this.get_elem_id();
        var tab = this.__dom_create_element('div', {}, id+tabname+tab_id);
        tab.style.visibility = 'hidden';
        this.__dom_add_class(tab, sclass+tabname, iclass+tabname);
        title.appendChild(tab);

        tab.style.height = header_height + 'px';

        this._restyle_tabs();
        return tab;
    };



    /* SWAP tab_title (change DOM elements position): */
    proto._tab_title_swap = function(tab1, tab2) {
log('Switching tabs : '+tab1.id + ' ~ ' +  tab2.id);

        /* Get Title TAB DIV: */
        var title = this.get_subelem('_title');

        /* Get tabs div elements: */
        title.removeChild( tab2 );
        title.insertBefore(tab2, tab1);

    };



    proto._restyle_tabs = function() {
        var id = this.get_elem_id();

        var tabs = Object.keys( this._tabs );
        var alltabs = tabs.length;
        var maxw = 99;
        var decorate = 0;
        
        /* More then one tab, lets decorate: */
        if (alltabs > 1) {
            maxw = 90;
            decorate = 1;
        }

        var sclass  = this['style_class'];
        var iclass  = sclass;
        var sclass1 = sclass;
        var iclass1 = sclass;
        if ( this['ident'] ) iclass += '_' + this['ident'];

        sclass += '_title_tab_decor';
        iclass += '_title_tab_decor';

        sclass1 += '_title_tab_active';
        iclass1 += '_title_tab_active';

        _this = this;

        var add_event = function (elem, tid) {
            add_event_listener( elem, 'onmousedown', function(kevent) {
                if (_is_touchscreen) return;
                _this._tab_longclick(kevent, tid);
            });

            add_event_listener( elem, 'ontouchstart', function(kevent) {
                _this._stop_tab_moving(kevent);

                ke = get_kevent(kevent);
                if (ke.stopPropagation)
                    ke.stopPropagation();
                else ke.cancelBubble = true;

                _this._tab_longclick(kevent, tid, 1);
            });


            /* On double click to tab - start tab moving: */
            add_event_listener( elem, 'ondblclick',
                function(kevent) {
                    downfunc = document.onmousedown;
        
                    /* Any another click stops moving: */
                    stop_on_elem_move('onmousedown', function () {
                        document.onmousedown=downfunc;
                    });

                    /* Start moving: */
                    titletab = _this.get_subelem( '_title_tab'+tid );
                    _this.set_active_tab(tid);
                    _this._start_tab_moving(kevent, tid);
            });
            return false;

        };

        var _this = this;
        var w = maxw / alltabs;
        for (var i=0; i<tabs.length; i++) {
            var tid = tabs[i];
            var tab = this.get_elem( id + '_title_tab' +  tid );
            if (!tab) continue;
            tab.style.width = w + '%';

log('Restyling tab: ' + tid);
            if (decorate) {
                this.__dom_add_class(tab, sclass, iclass);
                add_event(tab, tid);
            } else {
                add_event_listener( tab, 'onmousedown',  null );
                add_event_listener( tab, 'ondblclick',   null );
                add_event_listener( tab, 'ontouchstart', null );
                this.__dom_del_class(tab, sclass, iclass);
                this.__dom_del_class(tab, sclass1, iclass1);
            }
        }

        if (decorate) {
            var abs_tab = this.get_elem( id + '_title_tab_abs' );
            abs_tab.style.width = (w-10) + '%';
        }
    }





/*  
 * Window move / resize part:
**/ 

    proto._setupmouse = function () {
        /* Window move setup: */
        var header_elem = this.get_subelem( '_header' );
        var _this = this;

        stop_on_elem_move = function (kevent, callback) {
            add_event_listener( document, kevent,
                function(kevent) {

                    if ( tab_candidate ) {
                        var dst = tab_candidate.dst;
                        dst._clear_tab_candidate();
                    }

                    document.onmousemove=null;
                    if (typeof callback == 'function') callback();
            });
        };

        /* On click to window: ontop it */
        add_event_listener( this.get_elem(), 'onmousedown', 
            function(kevent) {

                _this.ontop(_this._act_tab); 

        });

        /* On click to header - start window moving: */
        add_event_listener( header_elem, 'onmousedown', 
            function(kevent) {
                if (_this._is_fixed) return false;

                kevent = get_kevent(kevent);
                if (_is_touchscreen) return 0;

                _this._start_window_moving(kevent); 
        });

        add_event_listener( header_elem, 'ontouchstart',
            function(kevent) {
                if (_this._is_fixed) return true;
                _this._start_window_moving_by_touchscreen(kevent);
        });

        add_event_listener( header_elem, 'ontouchmove', 
            function(kevent) {
                if (_this._is_fixed) return false;
                _this._move_window_by_touchscreen(kevent);
        });


        /* On double click to header - start window moving: */
        add_event_listener( header_elem, 'ondblclick',
            function(kevent) {
                if (_this._is_fixed) return false;
                downfunc = document.onmousedown;

                /* Any another click stops moving: */
                stop_on_elem_move('onmousedown', function () {
                    document.onmousedown=downfunc;
                });

                /* Start moving: */
                _this._start_window_moving(kevent);
        });



        /* Window resize setup: */
        var resize_elem = this.get_subelem( '_button_resize' );

        /* Resize window listener: */
        add_event_listener( resize_elem, 'onmousedown', 
            function(kevent) {
                if (_this._is_fixed) return false;
                _this._start_window_resizing(kevent);
        });

        add_event_listener( resize_elem, 'ontouchstart',
            function(kevent) {
                if (_this._is_fixed) return true;
                _this._start_window_resizing_by_touchscreen(kevent, resize_elem);
        });



        /* On double click to resizer - start window resize: */
        add_event_listener( resize_elem, 'ondblclick',
            function(kevent) {
                if (_this._is_fixed) return false;
                downfunc = document.onmousedown;

                /* Any another click stops moving: */
                stop_on_elem_move('onmousedown', function () {
                    document.onmousedown=downfunc;
                });

                /* Start moving: */
                _this._start_window_resizing(kevent);
        });


        /* On mouseUp - clear window move/resize events: */
        stop_on_elem_move('onmouseup');


        /* App buttons setup: */

        var elem = this.get_subelem( '_button_minimize' );
        add_event_listener( elem, 'onmousedown',
            function(kevent) { _this.minimize(); }
        );


        elem = this.get_subelem( '_button_maximize' );
        add_event_listener( elem, 'onmousedown',
            function(kevent) { _this.maximize(); }
        );

        
        elem = this.get_subelem( '_button_fix' );
        add_event_listener( elem, 'onmousedown',
            function(kevent) { _this.fix(); }
        );


        elem = this.get_subelem( '_button_close' );
        add_event_listener( elem, 'onmousedown',
            function(kevent) { _this.close(); }
        );


    };



    function get_kevent(event) {

        var eX, eY;

        var kevent = event || window.event;
        if (kevent && !eX) {
            eX = kevent.clientX;
            eY = kevent.clientY;
        } 

        // Only deal with one finger
        if( event && event.touches && event.touches.length == 1){ 
            var touch = event.touches[0]; // Get the information for finger #1
            var node = touch.target; // Find the node the drag started from
            eX = touch.pageX;
            eY = touch.pageY;
            _is_touchscreen = true;
        }

        if (eX && eY) {
            vectX = eX < lastX ? 0 : eX > lastX ? 1 : vectX;
            vectY = eY < lastY ? 0 : eY > lastY ? 1 : vectY;

            lastX = eX;
            lastY = eY;
        }

        return kevent;
    }
            

    /* Save delta coords from mouse cursor to window left: */
    proto._window_mouse_savedelta = function (kevent) {
        var coords = this._get_x_y(kevent);
        
        var x_offset = this.get_elem().offsetLeft;
        var y_offset = this.get_elem().offsetTop;
        
        this._delta.x = x_offset - coords[0];
        this._delta.y = y_offset - coords[1];
    };
            
    proto._start_window_moving = function (kevent) {
        if ( this._is_closed ) return 0;
        kevent = get_kevent(kevent);

        this._window_mouse_savedelta(kevent);

        var _this = this;
        add_event_listener( document, 'onmousemove',
            function(kevent) { 
                _this._remove_selection();
                _this._move_window(kevent);
                _this._remove_selection();
        });
    };
         
    proto._start_window_resizing = function (kevent) {
        if ( this._is_closed ) return 0;
        kevent = get_kevent(kevent);
        var _this = this;

        add_event_listener( document, 'onmousemove',
            function(kevent) { 
                _this._remove_selection();
                _this._resize_window(kevent);
                _this._remove_selection();
        });
    };


    proto._start_window_resizing_by_touchscreen = function (kevent, elem) {
        if ( this._is_closed ) return 0;
        kevent = get_kevent(kevent);
        var _this = this;

        add_event_listener( elem, 'ontouchmove',
            function(kevent) {
                if (kevent.touches.length != 1) return 0;
                kevent.preventDefault();

                _this._remove_selection();
                _this._resize_window(kevent);
                _this._remove_selection();
        });

        add_event_listener( elem, 'ontouchend',
            function(kevent) {
                add_event_listener( elem, 'ontouchmove' );
        });

    };


    proto._move_window = throttle( function (kevent) {
        if ( this._is_closed ) return 0;
        kevent = get_kevent(kevent);

        var coords = this._get_x_y(kevent);

        var new_x = this._delta.x + coords[0];
        var new_y = this._delta.y + coords[1];

        if (new_y < 0) new_y = 0;
        this.set_position(new_x, new_y);
        this._move_window__post();
    }, window_trottle_timeout);
            

    proto._move_window__post = function () {
        var elem = this._windows_under_me();
        if (elem) {


            /* 
               If window on another window 
               - check for new tab:
            */
            var _this = this;
            if (main_check_timeout(function() {})) {
                _this._can_be_tab_of(elem);
            }

        }
    };



    /* Moving window by touchscreen: */
    proto._start_window_moving_by_touchscreen = function (kevent) {
        kevent = get_kevent(kevent);
        this.ontop(); 
        this._window_mouse_savedelta(kevent);
    };

    proto._move_window_by_touchscreen = throttle( function (kevent) {
        if ( this._is_closed ) return 0;
        if (kevent.touches.length != 1) return 0;
        kevent.preventDefault();
        kevent = get_kevent(kevent);

        var new_x = this._delta.x + lastX;
        var new_y = this._delta.y + lastY;

        this.set_position(new_x, new_y);
        this._move_window__post();

    }, window_trottle_timeout);




    proto._resize_window = throttle( function (kevent) {
        if ( this._is_closed ) return 0;
        kevent = get_kevent(kevent);
        var coords = this._get_x_y(kevent);

        var x_offset = this.get_elem().offsetLeft;
        var y_offset = this.get_elem().offsetTop;

        var new_x = coords[0] + 4;
        var new_y = coords[1] + 4;

        var width  = new_x - x_offset;
        var height = new_y - y_offset;

        if (width  < window_minwidth)  width  = window_minwidth;
        if (height < window_minheight) height = window_minheight;
        this.set_size(width, height);
        this._restyle();
    }, window_trottle_timeout);


    proto._get_x_y = function (kevent) {
        kevent = get_kevent(kevent);
        var x, y;
        if (kevent) {
            //x=kevent.pageX;
            //y=kevent.pageY;
            x=lastX;
            y=lastY;
        }

        /* IE: */
        if (browsers[0]) {
            y-=2;
            x-=2;
        }

        return new Array(x, y);
    };


    proto._remove_selection = function () {
        var sel = window.getSelection ? 
            window.getSelection() : document.selection;
        if (sel) {
            if (sel.removeAllRanges) {
                sel.removeAllRanges();
            } else if (sel.empty) {
                sel.empty();
            }
        }
    };


    /* Find first window under `this' window: */
    proto._windows_under_me = function () {
        var x=lastX;
        var y=lastY;

        for (var i=this._layer - 1; i>=0; i--) {
            if (this._windows_layers[i]._is_closed) continue;
            if (this._windows_layers[i]._is_hidden) continue;
            var elem = this._windows_layers[i].get_elem();

            var h1 = parseInt(getElemTop(elem));
            var h2 = h1 + parseInt(elem.clientHeight);
            var w1 = parseInt(getElemLeft(elem));
            var w2 = w1 + parseInt(getElemWidth(elem));

            if ( y > h1 && y < h2 ) 
                if ( x > w1 && x < w2 ) 
                    return this._windows_layers[i];
        }
    };





/*
 * Window draw part:
**/


    /* Delete DOM object's class: */
    proto.__dom_del_class = function ( elem ) {
        for(var i=1; i<arguments.length; i++) {
            var cls = arguments[i];
            elem['className'] = elem['className'].replace(cls, '');
            elem['className'] = elem['className'].replace(/\s+/g, ' ');
        }
    }

    /* Add class to DOM object: */
    proto.__dom_add_class = function ( elem ) {
        for(var i=1; i<arguments.length; i++) {
            this.__dom_del_class(elem,  arguments[i]);
            elem['className'] += ' ' + arguments[i];
        }
    }

    /* Create any DOM element: */
    proto.__dom_create_element = function (name, params, id) {
        if (!params) params = {};
        var elem = document.createElement(name)
        for(var i in params) ww[i] = params[i];
        if (id) elem.id = id;
        return elem;
    }

        

    /* Create new window in DOM: */
    proto._draw = function () {
        var id = this.get_elem_id();

        /* Name of CSS class, and subclasses: ( e.g. ..._title ) */
        var sclass = this['style_class'];

        /* Persional Ident class: */
        var iclass = sclass;
        if ( this['ident'] ) iclass += '_' + this['ident'];

        
        /* Main window div: */
        var hdiv = this.__dom_create_element('div', {}, id);

        if (this.window_show_time)   
            increaseOpacity( hdiv, 0, this.window_show_time );

        this.__dom_add_class(hdiv, sclass, iclass);

        /* Hidden Ident DIV: */
        subname = '_hidden_ident';
        var hiddendiv = this.__dom_create_element('div', {}, id+subname);
        this.__dom_add_class(hiddendiv, hidden_ident_class);
        hiddendiv.innerHTML = this['ident'];
        hdiv.appendChild(hiddendiv);

        /* Header DIV: */
        var subname = '_header';
        var header  = this.__dom_create_element('div', { 
        }, id+subname);
        this.__dom_add_class(header, sclass+subname, iclass+subname);
        hdiv.appendChild(header);

        /* Fixed DIV: */
        subname = '_button_fix';
        var fixed   = this.__dom_create_element('div', {}, id+subname);
        this.__dom_add_class(fixed, sclass+subname, iclass+subname);

        /* Icon DIV: */ 
        subname = '_icon';
        var icon    = this.__dom_create_element('div', {}, id+subname);
        this.__dom_add_class(icon, sclass+subname, iclass+subname);

        /* Title DIV: */
        subname = '_title';
        var title   = this.__dom_create_element('div', {}, id+subname);
        this.__dom_add_class(title, sclass+subname, iclass+subname);

        /* Title Tab Absolute DIV: */
        subname = '_title_tab_abs';
        var tabsl   = this.__dom_create_element('div', {}, id+subname);
        this.__dom_add_class(tabsl, sclass+subname, iclass+subname);
        title.appendChild(tabsl);


        /* App buttons div: */
        subname = '_appbuttons';
        var appbt   = this.__dom_create_element('div', {}, id+subname);
        this.__dom_add_class(appbt, sclass+subname, iclass+subname);

        /* Minimaze button: */
        subname = '_button_minimize';
        var btmin   = this.__dom_create_element('div', {}, id+subname);
        this.__dom_add_class(btmin, sclass+subname, iclass+subname);

        /* Maximaze button: */
        subname = '_button_maximize';
        var btmax   = this.__dom_create_element('div', {}, id+subname);
        this.__dom_add_class(btmax, sclass+subname, iclass+subname);

        /* Close button: */
        subname = '_button_close';
        var btclose = this.__dom_create_element('div', {}, id+subname);
        this.__dom_add_class(btclose, sclass+subname, iclass+subname);

        /* Append Fix button and title DIVs to header: */
        header.appendChild(fixed);
        header.appendChild(icon);
        header.appendChild(title);


        /* Append buttons to App buttons DIV: */
        appbt.appendChild(btmin);   // Append minimize button
        appbt.appendChild(btmax);   // Append maximize button
        appbt.appendChild(btclose); // Append close button

        /* Append buttons DIV to header: */
        header.appendChild(appbt);


        /* Body DIV (Fader and content): */
        subname = '_body';
        var body    = this.__dom_create_element('div', {}, id+subname);
        this.__dom_add_class(body, sclass+subname, iclass+subname);
        hdiv.appendChild(body);

        subname = '_fader';
        var fader   = this.__dom_create_element('div', {}, id+subname);
        this.__dom_add_class(fader, sclass+subname, iclass+subname);

        subname = '_tabs';
        var tabs    = this.__dom_create_element('div', {}, id+subname);
        this.__dom_add_class(tabs, sclass+subname, iclass+subname);


        subname = '_tabs_tab';
        var content = this.__dom_create_element('div', {}, id+subname+'0');
        this.__dom_add_class(content, sclass+subname, iclass+subname);
        var cnttdiv = this.__dom_create_element('div');
        content.appendChild(cnttdiv);
        tabs.appendChild(content); // Append content

        body.appendChild(tabs);    // Append tabs
        body.appendChild(fader);   // Append fader


        /* Resize button DIV: */
        subname = '_button_resize';
        var resize  = this.__dom_create_element('div', {}, id+subname);
        this.__dom_add_class(resize, sclass+subname, iclass+subname);
        hdiv.appendChild(resize); 

        /* Append new window element to wrapper: */
        var wrapper = this.get_elem( this._divwrapper );
        wrapper.appendChild(hdiv);

        /* Append to title first tab: */
        var newtab = this._create_tab(this);
        newtab.style.visibility = 'visible';
    }




    /* Prepare Windows, set position and size: */
    proto._prepare = function() {
        this.set_position(this.left, this.top);
        this.set_size( this.width, this.height );

        /* Deactive all windows: */
        for (var i=0;i<this._windows_layers.length;i++)
            this._windows_layers[i].set_active(0);

        this._restyle_clear();
        this.ontop();
        this._setupmouse();
    };




    /* Throttled restyle window size: */
    proto._restyle = throttle( function () {
        this._restyle_clear();
    }, window_trottle_timeout);
    


    /* Recount window size: */
    proto._restyle_clear = function () {
        if ( this._is_closed ) return 0;
        this.get_elem().style.zIndex = start_layer + this._layer;
                        
        /* Recount title(header) length: */
        var hwidth = 0;
        var l = this.get_subelem('_appbuttons');
        //hwidth += $("#"+id).width();
        hwidth += l.offsetWidth;

        elem = this.get_subelem('_icon');
                        
        if (elem.style.display == 'block')
                hwidth += this.get_elem(id).offsetWidth;
                //hwidth += $("#"+id).width();

        elem = this.get_subelem('_button_fix');
                        
        if (elem.style.display == 'block')
                hwidth += this.get_elem(id).offsetWidth;
                //hwidth += $("#"+id).width();
                        
        //var title_width = $("#"+this.get_elem_id()).width();
        var title_width = this.get_elem().offsetWidth;
        title_width = title_width - hwidth - 40;
        id = this.get_elem_id() + '_title';
        this.get_elem( id ).style.width = title_width + 'px';
    };
        




/*
 * Layers managment part:
**/

    /* Group `this' with other window (group they layers ): */
    proto._layer_group = function( win ) {

        /* Test, if `this' allready in group: */
        if ( this._group >= 0 ) return false; 

        win._layer_ontop();
        this._layer_ontop();

        var gid = win._group;

        /* Make group: */
        if ( gid < 0 ) {
            gid = this._windows_groups.length;

            /* Set new group length == 1 */
            this._windows_groups[gid] = 1
            win._group = gid;
            win._id_in_group = 0; // add as first item
        }

        /* Attach `this' to group (as last item): */
        this._group = gid;
        this._id_in_group = this._windows_groups[gid];
        this._windows_groups[gid] += 1;

        return true;

        /*... It's only love, and that is all, why la lalala la... */
    };



    /* Remove `this' from group of windows(layers), and set onTop: */
    proto._layer_ungroup = function() {

        /* Test, if `this' allready not in group: */
        if ( this._group < 0 ) return false; 

        this._layer_ontop();
        var group = this._group

        /* Decrease length of group: */
        this._windows_groups[group] -= 1;

        /* Detatch `this' from group: */
        this._group = -1;
        this._id_in_group = 0;


        /* If there is one elem in group: detach it! */
        if ( this._windows_groups[group] == 1 )
            this._windows_layers[this._layer - 1]._layer_ungroup();

        /* Remove group if no items: */
        if (! this._windows_groups[group] )
            this._windows_groups.splice(group, 1);
        
        return true;
    }



    /* Set window on the top layer: */
    proto._layer_ontop = function() {

        /* Check, if layer allready ontop: */  
        if ( this._windows_layers.length-1 <= this._layer) 
            return 0;
            
        /* First, remove item or it's group from layers array: */
        var start_id = this._layer;
        var count    = 1;    // to remove: single layer

        /* Check if our object is member of group: */
        if ( this._group >= 0 ) {
            start_id = this._layer - this._id_in_group;
            /* 
               Getting length of group:
               _windows_groups[] - Array of groups, 
               this._group - group index
            */
            count = this._windows_groups[this._group];
        }

        /* `grp' - removed array, our group: */
        var grp = this._windows_layers.splice(start_id, count); 

        /* 
           If removed `this' group of elements:
             - Cut obj. element from group `grp', and then
             - Push group at the end of layers array: 
        */
        if ( this._group >= 0 ) {
            grp.splice(this._id_in_group, 1); 
            for (i=0;i<grp.length;i++) 
                this._windows_layers.push(grp[i]);

            /* Change _id_in_group for each element: */
            for (var i=0; i<grp.length; i++)
                grp[i]._id_in_group = i;
            this._id_in_group = grp.length;
        }

        /* Push our layer at the end of layers: */
        this._windows_layers[this._windows_layers.length] = this;

        /* Update layer_id for all objects in layers: */
        for (var i=start_id; i<this._windows_layers.length; i++) 
            this._windows_layers[i]._layer = i;

        
        /* *smoke ... a little... */
    };



    /* Set window on the bottom layer: */
    proto._layer_onbottom = function() {

        /* Remove layer from group: */
        this._layer_ungroup();

        /* Remove from layers: */
        var id = this._layer;
        this._windows_layers.splice(id, 1); 

        /* Add to the bottom of layers: */
        this._windows_layers.unshift(this);

        /* Repear layer_id in changed layers: */ 
        for (var i=0; i<=id; i++) 
            this._windows_layers[i]._layer = i;
        return id;
    };



    /* Test for browser first: */
    function test_browser () {
        var verBr=navigator.userAgent;
        if (verBr.indexOf("Opera")!=-1)
            browsers[1] = 1;
        else {
            if (verBr.indexOf("MSIE")!=-1)
                browsers[0] = 1;
            else {          
                //if (verBr.indexOf("Firefox")!=-1)
                browsers[2] = 1;
            }
        }               
    }
    test_browser();


    return webWindows
}


/*          
 * Have fun!:)
**/
