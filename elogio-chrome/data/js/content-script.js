new Elogio(
    ['config', 'utils', 'dom', 'imageDecorator', 'locator', 'bridge', 'sidebarModule', 'messaging'],
    function (modules) {
        'use strict';
        var
            bridge = modules.getModule('bridge'),
            messaging = modules.getModule('messaging'),
            sidebarModule = modules.getModule('sidebarModule'),
            dom = modules.getModule('dom'),
            imageDecorator = modules.getModule('imageDecorator'),
            config = modules.getModule('config'),
            events = bridge.events,
            isPluginEnabled = true;
        config.ui.imageDecorator.iconUrl = chrome.extension.getURL('img/settings-icon.png');
        /*
         =======================
         PRIVATE MEMBERS
         =======================
         */
        //callback when scan page is finished
        var finish = function () {
            port.postMessage({eventName: events.pageProcessingFinished});
        };

        function undecorate() {
            var elements = dom.getElementsByAttribute(config.ui.decoratedItemAttribute, document);
            var i, n;
            for (i = 0, n = elements.length; i < n; i++) {
                imageDecorator.undecorate(elements[i], document);
            }
            // secondary remove uuid from all elements which we marks
            var elementsWithUUID = dom.getElementsByAttribute(config.ui.dataAttributeName, document);
            for (i = 0, n = elementsWithUUID.length; i < n; i++) {
                if (elementsWithUUID[i].hasAttribute(config.ui.dataAttributeName)) {
                    elementsWithUUID[i].removeAttribute(config.ui.dataAttributeName);
                }
            }
        }

        /**
         * Fires when query lookup is ready and we need to get annotations for image
         */
        messaging.on(events.imageDetailsRequired, function (imageObj) {
            port.postMessage({eventName: events.imageDetailsRequired, dtat: imageObj});
        });

        messaging.on(events.jqueryRequired, function () {
            if (typeof Mustache === 'undefined') {
                port.postMessage({eventName: events.mustacheRequired});
            } else {
                port.postMessage({eventName: events.sidebarRequired});
            }
        });
        messaging.on(events.imageDetailsReceived, function (imageObj) {
            sidebarModule.receivedImageDataFromServer(imageObj);
        });
        /**
         * Fires when we get info for image or error
         */
        messaging.on(events.newImageFound, function (imageObj) {
            //if we get lookup then decorate
            if (imageObj.lookup) {
                var element = dom.getElementByUUID(imageObj.uuid, document);
                if (element) {
                    imageDecorator.decorate(element, document, function (uuid) {
                        var element = document.getElementById(uuid);
                        var sidebar = $('#elogio-panel');
                        //if sidebar hidden then show it
                        if (sidebar.is(':hidden')) {
                            $('#elogio-button-panel').trigger('click');
                        }
                        sidebar.animate({scrollTop: element.offsetTop}, 500, 'swing', function () {
                            sidebarModule.openImage(uuid);
                        });
                    });
                }
            }
            sidebarModule.addOrUpdateCard(imageObj);
        });
        messaging.on(events.pluginStopped, function () {
            isPluginEnabled = false;
            $('#elogio-panel').remove();
            sidebarModule.cleanUp();
            $('#elogio-button-panel').remove();
            undecorate();
        });
        messaging.on(events.pluginActivated, function () {
            isPluginEnabled = true;
            if ($) {
                $('#elogio-button-panel').show();
            }
            port.postMessage({eventName: events.startPageProcessing});
        });

        messaging.on(events.ready, function (data) {
            var template = $.parseHTML(data.stringTemplate),
                button = new Image(),
                body = $('body'), sidebar;
            button.src = data.imgUrl;
            button = $(button);
            button.addClass('elogio-button');
            button.attr('href', "#elogio-panel");
            button.attr('id', 'elogio-button-panel');
            body.append(template);
            body.append(button);
            sidebar = $('#elogio-panel');
            button.elogioSidebar({side: 'right', duration: 300, clickClose: true});
            sidebarModule.startScan(document, document, null, sidebar, port, finish);
        });
        var port = chrome.runtime.connect({name: "content"});
        port.onMessage.addListener(function (request) {
            if (isPluginEnabled || request.eventName === events.pluginActivated) {
                messaging.emit(request.eventName, request.data);
            }
        });
        port.postMessage({eventName: 'registration'});
        if (!window.jQuery || !window.$) {
            port.postMessage({eventName: events.jqueryRequired});//jquery required
        } else {
            if (!Mustache) {
                port.postMessage({eventName: events.mustacheRequired});
            } else {
                port.postMessage({eventName: events.sidebarRequired});
            }
        }
    }
);