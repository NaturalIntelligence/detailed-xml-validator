/**
 * 
 * @param {array} data 
 * @param {array} rules 
 * @returns 
 */
module.exports.breakInSets = function(data, rules){
    const extra = {
        data: [],
        rules:[],
        common: []
    };
    
    for (var i = 0; i < data.length; i++){
        if (rules.indexOf(data[i]) === -1) extra.data.push(data[i]);
        else extra.common.push(data[i]);
    }

    for (var i = 0; i < rules.length; i++){
        if (data.indexOf(rules[i]) === -1 && rules[i] !== '@') extra.rules.push(rules[i]);
    }
    return extra;  
}