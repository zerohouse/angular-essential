angular.module('angular.essential', [])
    .directive('input', function () {
        return {
            priority: 2,
            restrict: 'E',
            compile: function (element) {
                element.on('compositionstart', function (e) {
                    e.stopImmediatePropagation();
                });
            }
        };
    })
    .directive('ngEnter', function () {
        return function (scope, element, attrs) {
            element.bind("keydown keypress", function (event) {
                if (event.which === 13) {
                    scope.$apply(function () {
                        scope.$eval(attrs.ngEnter);
                    });
                    event.preventDefault();
                }
            });
        };
    })
    .factory('ngClickOtherService', function ($document) {
        var tracker = [];
        return function ($scope, expr) {
            var i, t, len;
            for (i = 0, len = tracker.length; i < len; i++) {
                t = tracker[i];
                if (t.expr === expr && t.scope === $scope) {
                    return t;
                }
            }
            var handler = function () {
                $scope.$apply(expr);
            };
            $document.on('click', handler);
            $scope.$on('$destroy', function () {
                $document.off('click', handler);
            });
            t = {scope: $scope, expr: expr};
            tracker.push(t);
            return t;
        };
    })
    .directive('ngClickOther', function ($document, ngClickOtherService) {
        return {
            restrict: 'A',
            link: function (scope, elem, attr, ctrl) {
                var handler = function (e) {
                    e.stopPropagation();
                };
                elem.on('click', handler);

                scope.$on('$destroy', function () {
                    elem.off('click', handler);
                });

                ngClickOtherService(scope, attr.ngClickOther);
            }
        };
    })
    .service('$hangul', function () {
        this.getERO = function (word) {
            var last = word.charAt(word.length - 1);
            console.log(word, last);
            if (!is_hangul_char(last))
                return word + "(으)로";
            if (tSound(last) === "ᆧ")
                return word + "로";
            return word + "으로";
        };

        function tSound(a) {
            var r = (a.charCodeAt(0) - parseInt('0xac00', 16)) % 28;
            return String.fromCharCode(r + parseInt('0x11A8') - 1);
        }

        function is_hangul_char(ch) {
            var c = ch.charCodeAt(0);
            if (0x1100 <= c && c <= 0x11FF) return true;
            if (0x3130 <= c && c <= 0x318F) return true;
            return !!(0xAC00 <= c && c <= 0xD7A3);

        }
    })
    .factory('$ajax', ['$http', '$q', function ($http, $q) {
        var handlers = [];
        var $ajax = function (method, url, params, success, error, json) {
            var options = {
                method: method, url: url
            };
            if (json)
                options.headers = {'Content-Type': 'application/json'};
            else
                options.headers = {'Content-Type': 'application/x-www-form-urlencoded'};

            if (method === "GET" || method === "DELETE")
                options.params = params;
            else if (json)
                options.data = params;
            else {
                options.transformRequest = function (obj) {
                    var str = [];
                    for (var p in obj) {
                        if (obj[p] === undefined || obj[p] === "" || typeof obj[p] === "function" || obj[p] === null || obj[p] === "null")
                            continue;
                        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
                    }
                    return str.join("&");
                };
                options.data = params;
            }

            $http(options).success(function (response) {
                if (!success)
                    return;
                for (var i = 0; i < handlers.length; i++) {
                    if (!handlers[i](response)) {
                        error(response);
                        return;
                    }
                }
                success(response);
            }).error(function (e) {
                if (!error)
                    return;
                error(e);
            });
        };
        $ajax.get = function (url, params) {
            return $q(function (resolve, reject) {
                $ajax("GET", url, params, resolve, reject);
            });
        };
        $ajax.post = function (url, params, json) {
            return $q(function (resolve, reject) {
                $ajax("POST", url, params, resolve, reject, json);
            });
        };
        $ajax.put = function (url, params, json) {
            return $q(function (resolve, reject) {
                $ajax("PUT", url, params, resolve, reject, json);
            });
        };
        $ajax.delete = function (url, params) {
            return $q(function (resolve, reject) {
                $ajax("DELETE", url, params, resolve, reject);
            });
        };
        $ajax.handler = function (fn) {
            if (typeof fn !== 'function')
                throw "fn type not matched";
            handlers.push(fn);
        };
        return $ajax;
    }]);

