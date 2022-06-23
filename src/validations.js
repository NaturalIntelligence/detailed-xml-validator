module.exports.string = {
    minLength : function(expected, actual){
        return actual.length >= expected;
    },
    maxLength : function(expected, actual){
        return actual.length <= expected;
    },
    length : function(expected, actual){
        return actual.length === expected;
    },
    pattern: function(expected, actual, modifier){
        const regxp = new RegExp(expected,  modifier);
        return regxp.test(actual);
    }
}
module.exports.num = {
    min: function(expected, actual){
        return Number(actual) >= expected;
    },
    max: function(expected, actual){
        return Number(actual) <= expected;
    }
}
module.exports.list = {

    minOccurs: function(expected, actual){
        return actual >= expected;
    },
    maxOccurs: function(expected, actual){
        return actual <= expected;
    }
}

