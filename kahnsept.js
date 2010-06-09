namespace.lookup('com.pageforest.kahnsept').defineOnce(function (ns) {

    function Schema(name) {
        this.name = name;
        this.props = [];
    }

    Schema.methods({
        addProp: function (name, type) {
        },

        delProp: function(name) {
        }
    });

    ns.extend({
        'Schema': Schema
    });
});
