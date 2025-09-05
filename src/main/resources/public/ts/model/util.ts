//Deep filtering an Object based on another Object properties
//Supports "dot notation" for accessing nested objects, ex: ({a {b: 1}} can be filtered using {"a.b": 1})
export let deepObjectFilter = function (object, filter) {
    for (let prop in filter) {
        let splittedProp = prop.split(".");
        let objValue = object;
        let filterValue = filter[prop];
        for (let i = 0; i < splittedProp.length; i++) {
            objValue = objValue[splittedProp[i]];
        }
        if (filterValue instanceof Object && objValue instanceof Object) {
            if (!deepObjectFilter(objValue, filterValue))
                return false;
        } else if (objValue !== filterValue)
            return false;
    }
    return true;
}