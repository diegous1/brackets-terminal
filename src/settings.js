define(function (require, exports) {
    'use strict';
    var PreferencesManager = brackets.getModule('preferences/PreferencesManager'),
        Mustache = brackets.getModule('thirdparty/mustache/mustache'),
        Dialogs = brackets.getModule('widgets/Dialogs'),
        dialogTemplate = require('text!htmlContent/settings-dialog.html');

    var TERMINAL_SETTINGS_CLIENT_ID = 'bracketsTerminal',
        SETTINGS = 'settings';
    
    // Validation constraints
    var CONSTRAINTS = {
        port: {
            min: 1024,  // Avoid privileged ports
            max: 65535,
            default: 8080
        },
        fontSize: {
            min: 8,     // Minimum readable size
            max: 72,    // Maximum reasonable size
            default: 15
        }
    };

    var defaults = {
        port: CONSTRAINTS.port.default,
        fontSize: CONSTRAINTS.fontSize.default
    };

    // Validate individual setting value
    function validateSetting(key, value) {
        if (!CONSTRAINTS[key]) {
            return value;
        }

        var constraint = CONSTRAINTS[key];
        var numValue = parseInt(value, 10);

        // Check if valid number
        if (isNaN(numValue)) {
            console.warn('[Terminal Settings] Invalid ' + key + ' value:', value, '- using default:', constraint.default);
            return constraint.default;
        }

        // Clamp to valid range
        if (numValue < constraint.min) {
            console.warn('[Terminal Settings] ' + key + ' too small:', numValue, '- using minimum:', constraint.min);
            return constraint.min;
        }

        if (numValue > constraint.max) {
            console.warn('[Terminal Settings] ' + key + ' too large:', numValue, '- using maximum:', constraint.max);
            return constraint.max;
        }

        return numValue;
    }

    var prefs = PreferencesManager.getExtensionPrefs(TERMINAL_SETTINGS_CLIENT_ID);
    prefs.definePreference('settings', 'object', undefined, {
        keys: {
            port: {
                type: 'number',
                initial: defaults.port
            },
            fontSize: {
                type: 'number',
                initial: defaults.fontSize
            }
        }
    });
    
    function _getAllValues() {
        var settings = prefs.get(SETTINGS) || defaults;
        
        Object.keys(defaults).forEach(function (key) {
            var value = settings[key];
            if (typeof value === 'undefined') {
                value = defaults[key];
            }
            // Validate on read
            settings[key] = validateSetting(key, value);
        });

        return settings;
    }
    
    function _setAllValues(newSettings) {
        var oldSettings = prefs.get(SETTINGS);
        
        Object.keys(defaults).forEach(function (key) {
            var value = newSettings[key];
            if (typeof value === 'undefined') {
                newSettings[key] = oldSettings[key];
            } else {
                // Validate on write
                newSettings[key] = validateSetting(key, value);
            }
        });

        prefs.set(SETTINGS, newSettings);
    }
    
    var settings;

    var _init = function () {
        settings = _getAllValues();
    };

    var _handleSave = function () {
        var inputValues = $('.brackets-terminal-settings-dialog').find('input').serializeArray();
        inputValues.forEach(function (configElement) {
            settings[configElement.name] = configElement.value;
        });
        _setAllValues(settings);
        settings = _getAllValues();
        $('#brackets-terminal-save').off('click', _handleSave);
    };

    var _showDialog = function () {
        Dialogs.showModalDialogUsingTemplate(Mustache.render(dialogTemplate, settings));
        $('#brackets-terminal-save').on('click', _handleSave);
    };

    var _set = function (key, value) {
        settings[key] = validateSetting(key, value);
        _setAllValues(settings);
        settings = _getAllValues();
    };

    var _getAll = function () {
        return settings;
    };

    var _get = function (key) {
        return settings[key];
    };

    _init();

    exports.showDialog = _showDialog;
    exports.set = _set;
    exports.getAll = _getAll;
    exports.get = _get;
});
