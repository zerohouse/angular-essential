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
    .directive('numberOnly', function () {
        return {
            require: 'ngModel',
            link: function (scope, element, attr, ngModelCtrl) {
                function fromUser(text) {
                    if (text) {
                        var transformedInput = text[0] == "-" ? "-" + text.replace(/[^0-9]/g, '') : text.replace(/[^0-9]/g, '');

                        if (transformedInput !== text) {
                            ngModelCtrl.$setViewValue(transformedInput);
                            ngModelCtrl.$render();
                        }
                        return transformedInput;
                    }
                    return undefined;
                }

                ngModelCtrl.$parsers.push(fromUser);
            }
        };
    })
    .directive('ngOnError', function () {
        return {
            link: function (scope, element, attrs) {
                element.bind('error', function () {
                    scope.$apply(function () {
                        scope.$eval(attrs.ngOnError);
                    });
                });
            }
        }
    })
    .service('$hangul', function () {
        this["으로"] = function (word) {
            return checkLastChar(word, "(으)로", "로", "으로");
        };

        this["이가"] = function (word) {
            return checkLastChar(word, "(이)가", "가", "이");
        };

        this["은는"] = function (word) {
            return checkLastChar(word, "(은)는", "는", "은");
        };

        this["을를"] = function (word) {
            return checkLastChar(word, "(을)를", "를", "을");
        };

        this["와과"] = function (word) {
            return checkLastChar(word, "(와)과", "와", "과");
        };

        function checkLastChar(word, ifNotHangul, noJongSung, hasJongSung) {
            if (!word)
                return "";
            if (typeof word !== "string") word = word.toString();
            var last = word.charAt(word.length - 1);
            if (/[013678]/.test(last))
                return word + hasJongSung;
            if (/[2459]/.test(last))
                return word + noJongSung;
            if (!is_hangul_char(last))
                return word + ifNotHangul;
            if (tSound(last) === "ᆧ")
                return word + noJongSung;
            return word + hasJongSung;
        }

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
    .factory('$ajax', ['$http', '$q', '$rootScope', function ($http, $q, $rootScope) {
        var handler;
        var before = [];
        var after = [];
        var $ajax = function (method, url, params, success, error, json, upload) {
            $rootScope.$broadcast('ajax-start');
            var self = this;
            self.progress = true;
            before.forEach(function (fn) {
                fn();
            });
            if ($ajax.url && !(url.startsWith("http://") || url.startsWith("https://")))
                url = $ajax.url + url;
            var options = {
                method: method, url: url
            };
            if (json)
                options.headers = {'Content-Type': 'application/json'};
            else if (upload)
                options.headers = {'Content-Type': undefined};
            else
                options.headers = {'Content-Type': 'application/x-www-form-urlencoded'};
            angular.merge(options.headers, $ajax.headers);
            if (method === "GET" || method === "DELETE") {
                options.url += "?dc=" + new Date().getTime().toString();
                options.params = params;
            }
            else if (json)
                options.data = params;
            else if (upload) {
                var fd = new FormData();
                for (var key in params) {
                    fd.append(key, params[key]);
                }
                options.data = fd;
                options.transformRequest = angular.identity;
            }
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

            $http(options).then(function onSuccess(res) {
                var response = res.data;
                $rootScope.$broadcast('ajax-done');
                self.progress = false;
                after.forEach(function (fn) {
                    fn()
                });
                if (!handler) {
                    success(response);
                    return;
                }
                handler(response, success, error);
            }).catch(function onError(e) {
                $rootScope.$broadcast('ajax-done');
                self.progress = false;
                after.forEach(function (fn) {
                    fn()
                });
                if (!error)
                    return;
                error(e);
            });
        };
        $ajax.headers = {};
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
        $ajax.upload = function (url, params) {
            return $q(function (resolve, reject) {
                $ajax("POST", url, params, resolve, reject, false, true);
            });
        };
        $ajax.handler = function (fn) {
            if (typeof fn !== 'function')
                throw "fn type not matched";
            handler = fn;
        };
        $ajax.headers = function (fn) {
            if (typeof fn !== 'function')
                throw "fn type not matched";
            handler = fn;
        };
        $ajax.before = function (fn, scope) {
            if (typeof fn !== 'function')
                throw "fn type not matched";
            before.push(fn);
            if (scope && scope.$on)
                scope.$on('$destroy', function () {
                    before.remove(fn);
                });
        };
        $ajax.after = function (fn, scope) {
            if (typeof fn !== 'function')
                throw "fn type not matched";
            after.push(fn);
            if (scope && scope.$on)
                scope.$on('$destroy', function () {
                    after.remove(fn);
                });
        };
        return $ajax;
    }])
    .directive('cardInput', function ($filter, $browser) {
        return {
            require: 'ngModel',
            link: function ($scope, $element, $attrs, ngModelCtrl) {
                var listener = function () {
                    var value = $element.val().replace(/[^0-9]/g, '');
                    $element.val($filter('card')(value, false));
                };

                // This runs when we update the text field
                ngModelCtrl.$parsers.push(function (viewValue) {
                    return viewValue.replace(/[^0-9]/g, '');
                });

                // This runs when the model gets updated on the scope directly and keeps our view in sync
                ngModelCtrl.$render = function () {
                    $element.val($filter('card')(ngModelCtrl.$viewValue, false));
                };

                $element.bind('change', listener);
                $element.bind('keydown', function (event) {
                    var key = event.keyCode;
                    // If the keys include the CTRL, SHIFT, ALT, or META keys, or the arrow keys, do nothing.
                    // This lets us support copy and paste too
                    if (key == 91 || (15 < key && key < 19) || (37 <= key && key <= 40)) {
                        return;
                    }
                    $browser.defer(listener); // Have to do this or changes don't get picked up properly
                });

                $element.bind('paste cut', function () {
                    $browser.defer(listener);
                });
            }
        };
    })
    .filter('card', function () {
        return function (card) {
            if (!card) {
                return '';
            }
            var value = card.toString().trim().replace(/^\+/, '');
            if (value.match(/[^0-9]/)) {
                return card;
            }
            if (value) {
                if (value.length > 12)
                    return value.slice(0, 4) + '-' + value.slice(4, 8) + '-' + value.slice(8, 12) + '-' + value.slice(12, 16);
                if (value.length > 8)
                    return value.slice(0, 4) + '-' + value.slice(4, 8) + '-' + value.slice(8, 12);
                if (value.length > 4)
                    return value.slice(0, 4) + '-' + value.slice(4, 8);
                return value;
            }
        };
    })
    .directive('phoneInput', function ($filter, $browser) {
        return {
            require: 'ngModel',
            link: function ($scope, $element, $attrs, ngModelCtrl) {
                var listener = function () {
                    var value = $element.val().replace(/[^0-9]/g, '');
                    $element.val($filter('phone')(value, false));
                };

                // This runs when we update the text field
                ngModelCtrl.$parsers.push(function (viewValue) {
                    return viewValue.replace(/[^0-9]/g, '');
                });

                // This runs when the model gets updated on the scope directly and keeps our view in sync
                ngModelCtrl.$render = function () {
                    $element.val($filter('phone')(ngModelCtrl.$viewValue, false));
                };

                $element.bind('change', listener);
                $element.bind('keydown', function (event) {
                    var key = event.keyCode;
                    // If the keys include the CTRL, SHIFT, ALT, or META keys, or the arrow keys, do nothing.
                    // This lets us support copy and paste too
                    if (key == 91 || (15 < key && key < 19) || (37 <= key && key <= 40)) {
                        return;
                    }
                    $browser.defer(listener); // Have to do this or changes don't get picked up properly
                });

                $element.bind('paste cut', function () {
                    $browser.defer(listener);
                });
            }
        };
    })
    .filter('phone', function () {
        return function (card) {
            if (!card) {
                return '';
            }
            var value = card.toString().trim().replace(/^\+/, '');
            if (value.match(/[^0-9]/)) {
                return card;
            }
            if (value) {
                if (value.length > 10)
                    return value.slice(0, 3) + '-' + value.slice(3, 7) + '-' + value.slice(7, 11);
                if (value.length == 10) {
                    if (value.charAt(1) === "2")
                        return value.slice(0, 2) + '-' + value.slice(2, 6) + '-' + value.slice(6);
                    return value.slice(0, 3) + '-' + value.slice(3, 6) + '-' + value.slice(6, 10);
                }
                if (value.length > 5) {
                    if (value.charAt(1) === "2")
                        return value.slice(0, 2) + '-' + value.slice(2, 5) + '-' + value.slice(5);
                    if (value.length > 7)
                        return value.slice(0, 3) + '-' + value.slice(3, 7) + '-' + value.slice(7);
                }
                if (value.length > 2) {
                    if (value.charAt(1) === "2")
                        return value.slice(0, 2) + '-' + value.slice(2, 5);
                    if (value.length > 3)
                        return value.slice(0, 3) + '-' + value.slice(3, 7);
                }
                return value;
            }
        };
    })
    .directive('businessNo', function ($filter, $browser) {
        return {
            require: 'ngModel',
            link: function ($scope, $element, $attrs, ngModelCtrl) {
                var listener = function () {
                    var value = $element.val().replace(/[^0-9]/g, '');
                    $element.val($filter('businessNo')(value, false));
                };

                // This runs when we update the text field
                ngModelCtrl.$parsers.push(function (viewValue) {
                    return viewValue.replace(/[^0-9]/g, '');
                });

                // This runs when the model gets updated on the scope directly and keeps our view in sync
                ngModelCtrl.$render = function () {
                    $element.val($filter('businessNo')(ngModelCtrl.$viewValue, false));
                };

                $element.bind('change', listener);
                $element.bind('keydown', function (event) {
                    var key = event.keyCode;
                    // If the keys include the CTRL, SHIFT, ALT, or META keys, or the arrow keys, do nothing.
                    // This lets us support copy and paste too
                    if (key == 91 || (15 < key && key < 19) || (37 <= key && key <= 40)) {
                        return;
                    }
                    $browser.defer(listener); // Have to do this or changes don't get picked up properly
                });

                $element.bind('paste cut', function () {
                    $browser.defer(listener);
                });
            }
        };
    })
    .filter('businessNo', function () {
        return function (card) {
            if (!card) {
                return '';
            }
            var value = card.toString().trim().replace(/^\+/, '');
            if (value.match(/[^0-9]/)) {
                return card;
            }
            if (value) {
                if (value.length > 5)
                    return value.slice(0, 3) + '-' + value.slice(3, 5) + '-' + value.slice(5, 10);
                if (value.length > 3)
                    return value.slice(0, 3) + '-' + value.slice(3, 5);
                return value;
            }
        };
    });

