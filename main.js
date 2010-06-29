namespace.lookup('com.pageforest.examples.kahnsept').defineOnce(function (ns) {
    var clientLib = namespace.lookup('com.pageforest.client');
    var base = namespace.lookup('org.startpad.base');
    var schemas = new Array();
    var schemaTitles = new Array();

    // Initialize the document - create a client helper object
    function onReady() {
        $('#title').focus();
        ns.client = new clientLib.Client(ns);
        // Quick call to poll - don't wait a whole second to try loading
        // the doc and logging in the user.
        ns.client.poll();
    }

    // This function is called whenever your document should be reloaded.
    function setDoc(json) {
        $('#title').val(json.title);
        if(json.blob.schemas)
            schemas = json.blob.schemas;
        displaySchema();
    }

    // Convert your current state to JSON with title and blob properties,
    // these will then be saved to pageforest's storage.
    function getDoc() {
        return {
            'title': $('#title').val(),
            'blob': {
            'schemas': schemas,
        },
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
        $('#mydocs').attr('href', 'http://' + ns.client.wwwHost + '/docs/');
        $('#app-details').attr('href', 'http://' + ns.client.wwwHost +
                               '/apps/' + ns.client.appid);
    }

    function displaySchema() {
        $('#schemas').empty();
        schemaTitles = base.map(schemas, function(v){return v.title});

        for(i = 0; i < schemas.length; i++)
            {
            if(schemas[i].expanded == true){
            $('#schemas').append('<div><input id="txtS'+i+'" type="text" value="'+schemas[i].title+'" style="width:300px" /><input type="button" value="Save" onclick="kahnsept.colSchema('+i+');" /><input type="button" value="Delete" onclick="kahnsept.delSchema('+i+')" /><ul>');



                for(j = 0; j < schemas[i].props.length; j++)
                {
                    $('#schemas').append('<li><div><input type="text" value="' + schemas[i].props[j].propname +
                            '" style="width:300px" id="props' + i + 'p' + j + '" /><input type="text" value="' + schemas[i].props[j].accepted +
                            '" style="width:300px" id="acpts' + i + 'p' + j + '"/><input type="button" value="Del" onclick="kahnsept.delProp('+i+" , "+j+')"></div></li>');
                    var autotemp = $('#acpts' + i + 'p' + j);
                    autotemp.autocomplete({source : schemaTitles});
                }




                 $('#schemas').append('<li>Add Property<input type="button" value="Add" onclick="kahnsept.addProp('+ i + ');" /></li></ul></div>');


            }
            else {
                $('#schemas').append('<div>'+schemas[i].title+'<input type="button" value="Edit" onclick="kahnsept.expSchema('+i+');" /></div>');
                }
            }

        displayInst();
    }

    function addSchema() {
        saveText();
        schemas.push({ "title": "NewSchema", "props": new Array({"propname" : "Title" , "accepted" : "Text"}), "instances": new Array(), "expanded": true, "instexp": true});
        displaySchema();
    }

    function delSchema(schemanum) {
        saveText();
        schemas.splice(schemanum, 1);
        displaySchema();
    }

    function addProp(schemanum){
        saveText();
        schemas[schemanum].props.push({"propname" : "NewPropName" , "accepted" : "Accepted Schema"});
        displaySchema();
    }

    function delProp(schemanum, propnum){
        saveText();
        schemas[schemanum].props.splice(propnum, 1);
        displaySchema();
    }

    function displayInst(){
        $('#instances').empty();
        pile = "";
        for(i=0;i<schemas.length;i++){
            if(schemas[i].instexp == true){
                pile += ('<li>'+schemas[i].title+' ('+schemas[i].instances.length+') <input type="button" value="Save" onclick="kahnsept.colInst('+i+');" /><ul>');
                for(j=0;j<schemas[i].instances.length;j++){
                    pile+=('<li>Property : Accepted Schemas <input type="button" value="Delete" onclick="kahnsept.delInst('+i+','+j+');" /><ul>');
                    for(k=0;k<schemas[i].props.length;k++){
                        temp = schemas[i].props[k].accepted;
                        if (schemas[i].instances[j][schemas[i].props[k].propname])
                            temp = schemas[i].instances[j][schemas[i].props[k].propname];

                        pile+=('<li>'+schemas[i].props[k].propname+'<input type="text" value="'+temp+'" id="s'+i+'i'+j+'p'+k+'" style="width:300px" /></li>');
                    }
                    pile+= ('</ul></li>');
                }
                pile+=('<li><input type="button" value="Add Instance" onclick="kahnsept.addInst('+i+')" /></li></ul></li>');
            }
            else {
                pile += ('<li>'+schemas[i].title+' ('+schemas[i].instances.length+') <input type="button" value="Edit" onclick="kahnsept.expInst('+i+');" /></li>');
            }
        }
        $('#instances').append(pile);
    }

    function addInst(schemanum){
        saveText();
        schemas[schemanum].instances.push({"title": ('instance of '+schemas[schemanum].title+'')});
        displayInst();
    }

    function delInst(schemanum, instnum){
        saveText();
        schemas[schemanum].instances.splice(instnum, 1);
        displayInst();
    }

    function expSchema(schemanum){
        saveText();
        schemas[schemanum].expanded = true;
        displaySchema();
    }

    function colSchema(schemanum){
        saveText();
        schemas[schemanum].expanded = false;
        displaySchema();
    }

    function expInst(schemanum){
        schemas[schemanum].instexp = true;
        displaySchema();
    }

    function colInst(schemanum){
        saveText();
        schemas[schemanum].instexp = false;
        displaySchema();
    }

    function saveText() {
        for(i=0;i<schemas.length;i++){

                    for(j=0;j<schemas[i].props.length;j++){
                        if(schemas[i].expanded == true){
                            schemas[i].props[j].propname = $('#props'+i+'p'+j+'').val();
                            schemas[i].props[j].accepted = $('#acpts'+i+'p'+j+'').val();
                        }

                        for(k=0;k<schemas[i].instances.length;k++){
                            schemas[i].instances[k][schemas[i].props[j].propname] = $('#s'+i+'i'+k+'p'+j+'').val();

                            //Need to add code to read and save all of the instance values
                        }
                    }
                    if(schemas[i].expanded)
                        schemas[i].title = $('#txtS'+i).val();

        }
        getDoc();
    }

    // Exported functions
    ns.extend({
        onReady: onReady,
        getDoc: getDoc,
        setDoc: setDoc,
        onError: onError,
        onUserChange: onUserChange,
        onStateChange: onStateChange,
        signInOut: signInOut,
        addSchema: addSchema,
        delSchema: delSchema,
        addProp: addProp,
        delProp: delProp,
        addInst: addInst,
        delInst: delInst,
        expSchema: expSchema,
        colSchema: colSchema,
        expInst: expInst,
        colInst: colInst
    });

});
