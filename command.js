/*jslint evil: true */
namespace.lookup('com.pageforest.kahnsept.command').defineOnce(function (ns) {
    var clientLib = namespace.lookup('com.pageforest.client');
    var kahnsept = namespace.lookup('com.pageforest.kahnsept');
    var world;
    var last;

    function updateJSON() {
        var s = JSON.stringify(world.toJSON(), undefined, 4);
        $('#json').text(s);
        $('#value').text(JSON.stringify(last));
    }

    function execCommand() {
        var s = $('#command').val();
        try {
            last = eval(s);
            $('#command').val('');
        } catch (e) {
            last = e.message;
        }
        updateJSON();
    }

    function onReady() {
        $('#command').focus();
        $('#command').keyup(function (e) {
            if (e.keyCode == 13) {
                execCommand();
            }
        });
        ns.client = new clientLib.Client(ns);
        world = new kahnsept.World();
        ns.client.poll();
    }

    // This function is called whenever your document should be reloaded.
    function setDoc(json) {
        world = new kahnsept.World();
        world.importJSON(json.blob);
        updateJSON();
    }

    // Convert your current state to JSON with title and blob properties,
    // these will then be saved to pageforest's storage.
    function getDoc() {
        return {
            "title": "Kahnsept Database",
            "blob": world.toJSON(),
            "readers": ["public"]
        };
    }

    // Called on any api errors.
    function onError(status, message) {
        $('#error').text(message);
    }

    // Called when the current user changes (signs in or out)
    function onUserChange(username) {
        var isSignedIn = username != undefined;
        $('#username').text(isSignedIn ? username : 'anonymous');
        $('#signin').val(isSignedIn ? 'Sign Out' : 'Sign In');
    }

    // Sign in (or out) depending on current user state.
    function signInOut() {
        var isSignedIn = ns.client.username != undefined;
        if (isSignedIn) {
            ns.client.signOut();
        }
        else {
            ns.client.signIn();
        }
    }

    function onStateChange(newState, oldState) {
        $('#doc-state').text(newState);
        $('#error').text('');

        updateJSON();

        // Allow save if doc is dirty OR not bound (yet) to a document.
        if (ns.client.isSaved()) {
            $('#save').attr('disabled', 'disabled');
        }
        else {
            $('#save').removeAttr('disabled');
        }

        // Refresh links on the page, too
        var url = ns.client.getDocURL();
        var link = $('#document');
        if (url) {
            link.attr('href', url + '?callback=document').show();
        }
        else {
            link.hide();
        }
    }

    // Exported functions
    ns.extend({
        'onReady': onReady,
        'getDoc': getDoc,
        'setDoc': setDoc,
        'onError': onError,
        'onUserChange': onUserChange,
        'onStateChange': onStateChange,
        'signInOut': signInOut
    });

});
