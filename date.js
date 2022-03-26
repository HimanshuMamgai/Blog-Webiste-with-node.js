exports.getDate = () => {
    var today = new Date();

    var options = {
        day : 'numeric',
        month : 'long',
        year : 'numeric'
    };

    var day = today.toLocaleDateString("en-Us", options);

    return day;
}