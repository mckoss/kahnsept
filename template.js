namespace.lookup('org.startpad.template').defineOnce(function (ns) {
    var util = namespace.util;
    var base = namespace.lookup('org.startpad.base');
    var format = namespace.lookup('org.startpad.format');

    var standardFilters = {
        'safe': function(s, obj, node) {
            node.isSafe = true;
            return s;
        }
    };

    // General purpose template evaluation.
    function Template(source) {
        this.filters = standardFilters;
        this.stack = [];
        this.parse(source);
        return this;
    }

    function Node(type, content) {
        this.type = type;
        this.content = content;
        this.isSafe = false;
        this.nodes = [];
    }

    Template.methods({
        'parse': function(source) {
            this.source = source;
            this.root = new Node('block');

            this.pushNode(this.root);
            this.ich = 0;
            while (this.ich < source.length) {
                this.nextToken();
            }

            if (this.stack.length != 1) {
                throw new Error("Missing closing tag 'end" +
                                this.stack[this.stack.length - 1].type + "'.");
            }
        },

        pushNode: function(node) {
            this.stack.push(node);
            if (this.current) {
                this.current.nodes.push(node);
            }
            this.current = node;
        },

        popNode: function() {
            this.stack.pop();
            this.current = this.stack[this.stack.length - 1];
        },

        'nextToken': function() {
            var ichEnd;
            var ichToken = this.source.indexOf('{', this.ich);
            var node;

            if (ichToken == -1) {
                ichToken = this.source.length;
            }
            this.current.addNode('text',
                                 this.source.substring(this.ich,
                                                       ichToken));
            if (ichToken == this.source.length) {
                this.ich = ichToken;
                return;
            }
            switch (this.source[ichToken + 1]) {
            case '{':
                var filters;

                ichEnd = this.source.indexOf('}}', ichToken + 2);
                if (ichEnd == -1) {
                    throw new Error("Unbalanced token at " + ichToken);
                }
                var propName = this.source.substring(ichToken + 2, ichEnd);
                propName = base.strip(propName);

                // Parse any filters given
                if (propName.indexOf('|') != -1) {
                    var parts = propName.split('|');
                    propName = parts[0];
                    filters = parts.slice(1);
                    base.forEach(filters, function(filter, i) {
                        var fn = this.filters[filter];
                        if (fn == undefined) {
                            throw new Error("No such filter: '" +
                                            filter + "'.");
                        }
                        filters[i] = fn;
                    }.fnMethod(this));
                }

                node = this.current.addNode('var', propName);

                if (filters) {
                    node.filters = filters;
                }

                this.ich = ichEnd + 2;
                break;

            case '%':
                ichEnd = this.source.indexOf('%}', ichToken + 2);
                if (ichEnd == -1) {
                    throw new Error("Unbalanced token at " + ichToken);
                }
                var blockExp = this.source.substring(ichToken + 2, ichEnd);
                blockExp = base.strip(blockExp);
                this.ich = ichEnd + 2;

                var terms = blockExp.split(/ +/);
                switch (terms[0]) {
                case 'for':
                    if (terms[2] != 'in') {
                        throw new Error("Syntax error: for var *in* list.");
                    }
                    node = new Node('for', terms[1]);
                    node.listExpr = terms[3];
                    this.pushNode(node);
                    break;

                case 'endfor':
                    if (this.current.type != 'for') {
                        throw new Error(
                            "Tag 'endfor' without matching 'for' tag.");
                    }
                    this.popNode();
                    break;

                case 'block':
                    throw new Error("Blocks NYI.");

                default:
                    throw new Error("Unrecognized block type: " +
                                    terms[0] + ".");
                }
                break;

            default:
                this.current.addNode('text',
                                     this.source.substring(this.ichToken,
                                                           this.ichToken + 1));
                this.ich = this.ichToken + 1;
                break;
            }
        },

        'render': function(obj) {
            return this.root.render(obj);
        }
    });

    Node.methods({
        'render': function(obj) {
            var s = "";

            switch (this.type) {
            case 'text':
                return this.content;

            case 'var':
                s = ns.evalProp(this.content, obj);
                base.forEach(this.filters, function(filter) {
                    s = filter(s, obj, this);
                }.fnMethod(this));
                if (!this.isSafe) {
                    s = format.escapeHTML(s);
                }
                return s;

            case 'for':
                var list = ns.evalProp(this.listExpr, obj);
                if (!list instanceof Array) {
                    list = [list];
                }
                base.forEach(list, function(value) {
                    obj[this.content] = value;
                    base.forEach(this.nodes, function(node) {
                        s += node.render(obj);
                    });
                }.fnMethod(this));
                return s;

            case 'block':
                base.forEach(this.nodes, function(node) {
                    s += node.render(obj);
                });
                return s;
            }
        },

        'addNode': function(type, content) {
            var node = new Node(type, content);
            this.nodes.push(node);
            return node;
        }
    });

    // Evaluate the property expression in the context of the
    // object.  Returns an array of values.
    function evalProp(propExp, obj) {
        var parts = propExp.split('.');
        // Successively refine result array (can be multi-value)
        var res = [obj];
        // Evaluate each property reference in turn
        base.forEach(parts, function(part) {
            var resNext = [];
            // ... for each of the objects in the previous result array
            base.forEach(res, function(each) {
                if (each instanceof Object &&
                    each[part] != undefined) {
                    var values = each[part];
                    if (!(values instanceof Array)) {
                        values = [values];
                    }
                    // ... add each of the child values to the new result
                    base.forEach(values, function(value) {
                        if (resNext.indexOf(value) == -1) {
                            resNext.push(value);
                        }
                    });
                }
            });
            res = resNext;
        });
        switch (res.length) {
        case 0:
            return undefined;
        case 1:
            return res[0];
        default:
            return res;
        }
    }

    ns.extend({
        'Template': Template,
        'evalProp': evalProp
    });
});
