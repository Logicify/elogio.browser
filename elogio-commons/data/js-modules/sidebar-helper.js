/**
 * Created by TEMA on 15.10.2014.
 * Warning: jquery and Mustache required!
 */
Elogio.modules.sidebarHelper = function (modules) {
    var self = this;
    /*
     =======================
     REQUIREMENTS
     =======================
     */


    var config = modules.getModule('config'), utils = modules.getModule('utils');


    /*
     =======================
     PRIVATE MEMBERS
     =======================
     */
    function setLicenseColor(licensePlaceHolder, license) {
        if (utils.startsWith(license, 'http://www.europeana.eu/rights/out-of-copyright-non-commercial')) {
            licensePlaceHolder.css({
                backgroundColor: 'yellow'
            });
            return;
        }
        license = license.replace('http://creativecommons.org/', '');
        if (
            utils.startsWith(license, 'licenses/by') ||
            utils.startsWith(license, 'publicdomain/mark') ||
            utils.startWith(license, 'licenses/by-sa')) {
            licensePlaceHolder.css({
                backgroundColor: 'green'
            });
        } else if (
            utils.startsWith(license, 'licenses/by-nd') ||
            utils.startsWith(license, 'licenses/by-nc-nd') ||
            utils.startsWith(license, 'licenses/by-nc') ||
            utils.startsWith(license, 'licenses/by-nc-sa')) {
            licensePlaceHolder.css({
                backgroundColor: 'yellow'
            });
        } else {
            licensePlaceHolder.css({
                backgroundColor: 'red'
            });
        }
    }

    /*
     =======================
     PUBLIC MEMBERS
     =======================
     */


    self.createCanvas = function (document, imageCard, callback) {
        var canvas = document.createElement('canvas'),
            ctx = canvas.getContext('2d');
        var image = new Image();
        image.crossOrigin = "Anonymous";
        image.src = imageCard.find('img')[0].src;
        image.onload = function () {
            var data =
                '<svg xmlns="http://www.w3.org/2000/svg" width="' + imageCard.find('.elogio-image-details').width() + '" height="' + imageCard.find('.elogio-image-details').height() + '">' +
                '<foreignObject width="100%" height="100%">' +
                '<div xmlns="http://www.w3.org/1999/xhtml" style="font-size:16px">' +
                imageCard.find('.elogio-annotations-title').html() +
                '<p>' +
                imageCard.find('.elogio-annotations-by').html() +
                '</p>' +
                '<p>' +
                imageCard.find('.elogio-license').html() +
                '</p>' +
                '</div>' +
                '</foreignObject>' +
                '</svg>';
            var DOMURL = window.URL || window.webkitURL || window;

            var img = new Image();
            img.crossOrigin = "Anonymous";
            var svg = new Blob([data], {type: 'image/svg+xml;charset=utf-8'});
            var url = DOMURL.createObjectURL(svg);

            img.onload = function () {
                canvas.width = image.width;
                canvas.height = image.height + img.height;
                ctx.drawImage(image, 0, 0, image.width, image.height);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, image.height, image.width, img.height);
                ctx.drawImage(img, 0, 0, img.width, img.height, 0, image.height + 5, img.width, img.height);
                DOMURL.revokeObjectURL(url);
                callback(canvas.toDataURL('image/png'))
            };
            img.src = url;
        };
    };

    /**
     *
     * @param annotations - is needed for create properties of JSON
     * @returns {*}
     */
    self.jsonToString = function (annotations) {
        var stringJson = {
            locatorLink: annotations.locatorLink,
            titleLabel: annotations.titleLabel,
            creatorLink: annotations.creatorLink,
            creatorLabel: annotations.creatorLabel,
            licenseLink: annotations.licenseLink,
            licenseLabel: annotations.licenseLabel,
            copyrightLink: annotations.copyrightLink,
            copyrightLabel: annotations.copyrightLabel

        };
        return JSON.stringify(stringJson);
    };

    /**
     * Method which setups annotations for image, and returns it back
     * @param annotations - is needed for initializing details
     * @returns {*}
     */
    self.initAnnotationsForCopyHandler = function (annotations) {
        annotations.locatorLink = annotations.getLocatorLink();
        annotations.titleLabel = annotations.getTitle();
        annotations.creatorLink = annotations.getCreatorLink();
        annotations.creatorLabel = annotations.getCreatorLabel();
        annotations.licenseLink = annotations.getLicenseLink();
        annotations.licenseLabel = annotations.getLicenseLabel();
        annotations.copyrightLink = annotations.getCopyrightLink();
        annotations.copyrightLabel = annotations.getCopyrightLabel();
        return annotations;
    };

    /**
     *
     * @param imageList - jquery object container of image cards
     * @param imageObj - image object which we get from content {uri, uuid, lookup, details, error}
     * @param imageItemTemplate - jquery object (selector) of template
     */
    self.addOrUpdateImageCard = function (imageList, imageObj, imageItemTemplate, locale) {
        // Try to find existing card and create the new one if it wasn't rendered before
        var cardElement = imageList.find('#' + imageObj.uuid);
        if (!cardElement.length) {
            cardElement = $(Mustache.render(imageItemTemplate, {'imageObj': imageObj}));
            cardElement.find('[dropDownl10n]').text(locale.dropDownMenuLabel);
            cardElement.find('[copyHtmlLabell10n]').text(locale.copyHtmlButtonLabel);
            cardElement.find('[copyJsonLabell10n]').text(locale.copyJsonButtonLabel);
            cardElement.find('[copyImgLabell10n]').text(locale.copyImgButtonLabel);
            cardElement.find('[sourceLabell10n]').text(locale.sourceButtonLabel);
            cardElement.find('[licenseLabell10n]').text(locale.licenseButtonLabel);
            cardElement.find('[reportLabell10n]').text(locale.reportButtonLabel);
            cardElement.find('[noLookupl10n]').text(locale.noLookup);
            cardElement.find('[queryLabell10n]').text(locale.queryButtonLabel);
            cardElement.find('[openImageInNewTabl10n]').text(locale.openImgInNewTabLabel);
            cardElement.data(config.sidebar.imageObject, imageObj);
            imageList.append(cardElement);
        }
        // If we didn't send lookup query before - show loading
        if (!imageObj.hasOwnProperty('lookup') && !imageObj.hasOwnProperty('error')) {
            cardElement.find('.loading').show();
            return; // Waiting for lookup....
        } else {
            cardElement.find('.loading').hide();
            cardElement.find('.message-area').hide();
        }
        // If there is lookup data available check if there is image details
        var errorArea = cardElement.find('.error-area');
        if (imageObj.lookup && imageObj.lookup.href && !imageObj.error) {
            cardElement.data(config.sidebar.imageObject, imageObj);// save lookup data to card
            if (imageObj.hasOwnProperty('details')) { // If annotations were loaded...
                self.initializeDetails(imageObj, cardElement);
                errorArea.hide();//hide this anyway because it is wrong show both of messages
            } else {
                // Nothing to do hear just waiting when user clicks on image to query details
            }
        } else { // Show Query button
            cardElement.find('.image-found').hide();
            if (!imageObj.error) {
                cardElement.find('.image-not-found').show();
                errorArea.hide();//hide this anyway because it is wrong show both of messages
            } else {
                //at here imageObj has errors and need to show it in sidebar
                errorArea.text(imageObj.error);
                errorArea.show();
                if (imageObj.blockhashError) {
                    var hash = cardElement.find('.elogio-hash');
                    hash.attr('href', imageObj.uri);
                    hash.show();
                }
            }
        }
    };
    self.initializeDetails = function (imageObj, cardElement) {
        var annotations = new Elogio.Annotations(imageObj, config);
        if (imageObj.details) { // If we were abe to get annotations - populate details
            if (annotations.getCopyrightLabel()) {
                cardElement.find('.elogio-annotations-by').text('By ' + annotations.getCopyrightLabel());
            } else if (annotations.getCreatorLabel()) {
                cardElement.find('.elogio-annotations-by').text('By ' + annotations.getCreatorLabel());
            }
            cardElement.find('.elogio-locatorlink').attr('href', annotations.getLocatorLink());
            if (annotations.getTitle()) {
                cardElement.find('.elogio-annotations-title').text(annotations.getTitle());
            } else {
                cardElement.find('.elogio-annotations-title').hide();
            }
            if (annotations.getGravatarLink()) {//if exist profile then draw gravatar
                cardElement.find('.elogio-gravatar').attr('src', annotations.getGravatarLink() + "?s=40");
            } else {
                cardElement.find('.elogio-gravatar').hide();//if no gravatar then hide
            }
            if (annotations.getLicenseLabel()) {
                var license = annotations.getLicenseLabel().trim(),
                    licenseLink = annotations.getLicenseLink(),
                    licensePlaceHolder = cardElement.find('.elogio-license');
                if (licenseLink) {
                    setLicenseColor(licensePlaceHolder, licenseLink);
                } else {
                    licensePlaceHolder.css({
                        backgroundColor: 'gray'   //if no link was founded
                    });
                }
                licensePlaceHolder.text(annotations.getLicenseLabel());
            } else {
                cardElement.find('.elogio-license').hide();
            }
            if (annotations.getLicenseLink()) {
                cardElement.find('.elogio-license-link').attr('href', annotations.getLicenseLink());
            } else {
                cardElement.find('.elogio-license-link').hide();
            }
        } else { // Otherwise - show message
            cardElement.find('.message-area').show();
            cardElement.find('.image-not-found').hide();
        }
    };
};
