function PunkAveFileUploader(options) {
    var self = this,
        uploadUrl = options.uploadUrl,
        viewUrl = options.viewUrl,
        $el = $(options.el),
        uploaderTemplate = _.template($.trim($('#file-uploader-template').html()));
    $el.html(uploaderTemplate({}));

    var fileTemplate = _.template($.trim($('#file-uploader-file-template').html())),
        editor = $el.find('[data-files="1"]'),
        thumbnails = $el.find('[data-thumbnails="1"]');

    self.uploading = false;

    function defaultCallback(info) {
        if (window.console && console.log) {
            console.log(info);
        }
    }

    self.errorCallback = 'errorCallback' in options ? options.errorCallback : defaultCallback;
    self.successCallback = 'successCallback' in options ? options.successCallback : defaultCallback;

    self.addExistingFiles = function (files) {
        _.each(files, function (file) {
            var encodedFile = encodeURIComponent(file);
            appendEditableImage({
                // cmsMediaUrl is a global variable set by the underscoreTemplates partial of MediaItems.html.twig
                'thumbnail_url': viewUrl + '/thumbnails/' + encodedFile,
                'url': viewUrl + '/originals/' + encodedFile,
                'name': file
            });
        });
    };

    // Delay form submission until upload is complete.
    // Note that you are welcome to examine the
    // uploading property yourself if this isn't
    // quite right for you
    self.delaySubmitWhileUploading = function (sel) {
        $(sel).submit(function (e) {
            if (!self.uploading) {
                return true;
            }
            function attempt() {
                if (self.uploading) {
                    setTimeout(attempt, 100);
                }
                else {
                    $(sel).submit();
                }
            }
            attempt();
            return false;
        });
    }

    if (options.blockFormWhileUploading) {
        self.blockFormWhileUploading(options.blockFormWhileUploading);
    }

    if (options.existingFiles) {
        self.addExistingFiles(options.existingFiles);
    }

    editor.fileupload({
        dataType: 'json',
        url: uploadUrl,
        dropZone: $el.find('[data-dropzone="1"]'),
        done: function (e, data) {
            if (data) {
                _.each(data.result, function (item) {
                    appendEditableImage(item);
                });
                self.successCallback(data);
            }
        },
        start: function (e) {
            $el.find('[data-spinner="1"]').show();
            self.uploading = true;
        },
        stop: function (e) {
            $el.find('[data-spinner="1"]').hide();
            self.uploading = false;
        }
    });

    // Expects thumbnail_url, url, and name properties. thumbnail_url can be undefined if
    // url does not end in gif, jpg, jpeg or png. This is designed to work with the
    // result returned by the UploadHandler class on the PHP side
    function appendEditableImage(info) {
        if (info.error) {
            self.errorCallback(info);
            return;
        }

        var HTTP_STATUS_CODE_LOCKED = 423,
            $thumbnailContainer = $(fileTemplate(info)),
            $deleteButton = $thumbnailContainer.find('[data-action="delete"]');

        $deleteButton.click(function () {
            var $currentDeleteButton = $(this),
                $currentThumbnailContainer = $currentDeleteButton.closest('[data-name]'),
                fileName = $currentThumbnailContainer.attr('data-name');

            $.ajax({
                type: 'delete',
                url: setQueryParameter(uploadUrl, 'file', fileName),
                success: function () {
                    $currentThumbnailContainer.remove();
                },
                error: function (xhr) {
                    var errorType = xhr.status === HTTP_STATUS_CODE_LOCKED ? 'locked' : 'unknown';
                    $currentDeleteButton.trigger('image-deletion-error', errorType);
                },
                dataType: 'json'
            });

            return false;
        });

        thumbnails.append($thumbnailContainer);
    }

    function setQueryParameter(url, param, paramVal) {
        var newAdditionalURL = "";
        var tempArray = url.split("?");
        var baseURL = tempArray[0];
        var additionalURL = tempArray[1];
        var temp = "";
        if (additionalURL) {
            tempArray = additionalURL.split("&");
            var i;
            for (i = 0; i < tempArray.length; i++) {
                if (tempArray[i].split('=')[0] != param) {
                    newAdditionalURL += temp + tempArray[i];
                    temp = "&";
                }
            }
        }
        var newTxt = temp + "" + param + "=" + encodeURIComponent(paramVal);
        return baseURL + "?" + newAdditionalURL + newTxt;
    }
}
