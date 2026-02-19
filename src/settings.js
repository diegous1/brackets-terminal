define(function (require, exports) {
    'use strict';
    var PreferencesManager = brackets.getModule('preferences/PreferencesManager'),
        Mustache = brackets.getModule('thirdparty/mustache/mustache'),
        Dialogs = brackets.getModule('widgets/Dialogs'),
        dialogTemplate = require('text!htmlContent/settings-dialog.html');

    var TERMINAL_SETTINGS_CLIENT_ID = 'bracketsTerminal',
        SETTINGS = 'settings';

    var CONSTRAINTS = {
        port: {
            min: 1,
            max: 65535,
            default: 8080
        },
        fontSize: {
            min: 8,
            max: 72,
            default: 15
        },
        connectTimeoutMs: {
            min: 500,
            max: 30000,
            default: 3000
        }
    };

    var ALLOWED_BACKEND_MODES = ['auto', 'local-node', 'remote-tty'];

    var defaults = {
        backendMode: 'auto',
        host: 'localhost',
        port: CONSTRAINTS.port.default,
        fontSize: CONSTRAINTS.fontSize.default,
        webFallbackEnabled: true,
        connectTimeoutMs: CONSTRAINTS.connectTimeoutMs.default
    };

    function validateNumberSetting(key, value) {
        var constraint = CONSTRAINTS[key];
        var numberValue = parseInt(value, 10);

        if (isNaN(numberValue)) {
            return constraint.default;
        }

        if (numberValue < constraint.min) {
            return constraint.min;
        }

        if (numberValue > constraint.max) {
            return constraint.max;
        }

        return numberValue;
    }

    function validateSetting(key, value) {
        if (key === 'backendMode') {
            return ALLOWED_BACKEND_MODES.indexOf(value) >= 0 ? value : defaults.backendMode;
        }

        if (key === 'host') {
            if (typeof value !== 'string' || !value.trim()) {
                return defaults.host;
            }
            return value.trim();
        }

        if (key === 'webFallbackEnabled') {
            if (typeof value === 'string') {
                return value.toLowerCase() === 'true';
            }
            return Boolean(value);
        }

        if (CONSTRAINTS[key]) {
            return validateNumberSetting(key, value);
        }

        return value;
    }

    var prefs = PreferencesManager.getExtensionPrefs(TERMINAL_SETTINGS_CLIENT_ID);
    prefs.definePreference('settings', 'object', undefined, {
        keys: {
            backendMode: {
                type: 'string',
                initial: defaults.backendMode
            },
            host: {
                type: 'string',
                initial: defaults.host
            },
            port: {
                type: 'number',
                initial: defaults.port
            },
            fontSize: {
                type: 'number',
                initial: defaults.fontSize
            },
            webFallbackEnabled: {
                type: 'boolean',
                initial: defaults.webFallbackEnabled
            },
            connectTimeoutMs: {
                type: 'number',
                initial: defaults.connectTimeoutMs
            }
        }
    });

    function _getAllValues() {
        var key;
        var settings = prefs.get(SETTINGS) || {};

        Object.keys(defaults).forEach(function (defaultKey) {
            var value = typeof settings[defaultKey] === 'undefined' ? defaults[defaultKey] : settings[defaultKey];
            settings[defaultKey] = validateSetting(defaultKey, value);
        });

        for (key in settings) {
            if (settings.hasOwnProperty(key) && !defaults.hasOwnProperty(key)) {
                delete settings[key];
            }
        }

        return settings;
    }

    function _setAllValues(newSettings) {
        var oldSettings = _getAllValues();
        var merged = {};

        Object.keys(defaults).forEach(function (key) {
            var value = typeof newSettings[key] === 'undefined' ? oldSettings[key] : newSettings[key];
            merged[key] = validateSetting(key, value);
        });

        prefs.set(SETTINGS, merged);
    }

    var settings;

    function _init() {
        settings = _getAllValues();
    }

    function _handleSave() {
        var inputValues = $('.brackets-terminal-settings-dialog').find('input').serializeArray();

        inputValues.forEach(function (configElement) {
            settings[configElement.name] = configElement.value;
        });

        _setAllValues(settings);
        settings = _getAllValues();
        $('#brackets-terminal-save').off('click', _handleSave);
    }

    function _showDialog() {
        Dialogs.showModalDialogUsingTemplate(Mustache.render(dialogTemplate, settings));
        $('#brackets-terminal-save').on('click', _handleSave);
    }

    function _set(key, value) {
        settings[key] = validateSetting(key, value);
        _setAllValues(settings);
        settings = _getAllValues();
    }

    function _getAll() {
        return settings;
    }

    function _get(key) {
        return settings[key];
    }

    _init();

    exports.showDialog = _showDialog;
    exports.set = _set;
    exports.getAll = _getAll;
    exports.get = _get;
});
