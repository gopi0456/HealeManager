var exec = require('cordova/exec');

exports.mainBill = function (arg0,arg1,arg2, success, error) {
    exec(success, error, 'Printer', 'mainBill', [arg0,arg1,arg2]);
};
exports.sendKot = function (arg0, arg1 ,success, error) {
    exec(success, error, 'Printer', 'sendKot', [arg0,arg1]);
};