(function () {

    angular
        .module('BackofficeApp')
        .directive('monarcRichText', ['gettextCatalog', MonarcRichTextDirective]);

    /**
     * Quill editor bound to an HTML string: <div monarc-rich-text ng-model="value"></div>.
     * The HTML is cleaned again by the server (HtmlSanitizer) when it is saved.
     */
    function MonarcRichTextDirective(gettextCatalog) {
        var TOOLBAR = [
            [{header: 2}, {header: 3}],
            ['bold', 'italic', 'underline', 'strike'],
            [{list: 'ordered'}, {list: 'bullet'}],
            ['blockquote', 'link'],
            ['clean']
        ];

        return {
            restrict: 'A',
            require: 'ngModel',
            link: function (scope, element, attrs, ngModel) {
                var editor = angular.element('<div></div>');
                element.addClass('rich-text').append(editor);
                var quill = new Quill(editor[0], {theme: 'snow', modules: {toolbar: TOOLBAR}});

                translateToolbar(element[0]);

                ngModel.$render = function () {
                    quill.setContents(quill.clipboard.convert({html: ngModel.$viewValue || ''}), Quill.sources.SILENT);
                };

                quill.on('text-change', function () {
                    // Quill 2.0.3 writes every space as &nbsp;, which stops the lines from wrapping
                    var html = quill.getText().trim() === '' ? '' : quill.getSemanticHTML().replace(/&nbsp;/g, ' ');
                    scope.$evalAsync(function () {
                        ngModel.$setViewValue(html);
                    });
                });
            }
        };

        function translateToolbar(container) {
            var titles = {
                '.ql-header[value="2"]': gettextCatalog.getString('Heading'),
                '.ql-header[value="3"]': gettextCatalog.getString('Subheading'),
                '.ql-bold': gettextCatalog.getString('Bold'),
                '.ql-italic': gettextCatalog.getString('Italic'),
                '.ql-underline': gettextCatalog.getString('Underline'),
                '.ql-strike': gettextCatalog.getString('Strikethrough'),
                '.ql-list[value="ordered"]': gettextCatalog.getString('Numbered list'),
                '.ql-list[value="bullet"]': gettextCatalog.getString('Bulleted list'),
                '.ql-blockquote': gettextCatalog.getString('Quote'),
                '.ql-link': gettextCatalog.getString('Link'),
                '.ql-clean': gettextCatalog.getString('Remove the formatting')
            };
            angular.forEach(titles, function (title, selector) {
                var button = container.querySelector('.ql-toolbar ' + selector);
                button.setAttribute('title', title);
                button.setAttribute('aria-label', title);
            });

            // The link bubble texts are CSS contents: they are given through variables read by style.css
            var labels = {
                '--rich-text-enter-link': gettextCatalog.getString('Enter the link:'),
                '--rich-text-open-link': gettextCatalog.getString('Open the link:'),
                '--rich-text-edit': gettextCatalog.getString('Edit'),
                '--rich-text-remove': gettextCatalog.getString('Remove'),
                '--rich-text-save': gettextCatalog.getString('Save')
            };
            angular.forEach(labels, function (label, variable) {
                container.style.setProperty(variable, JSON.stringify(label));
            });
            container.querySelector('.ql-tooltip input[type=text]').setAttribute('data-link', 'https://');
        }
    }

})();
