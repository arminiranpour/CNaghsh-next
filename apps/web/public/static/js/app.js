window.addEventListener("load" , function () {

    const dtp1Instance = new mds.MdsPersianDateTimePicker(document.getElementById("persianDatapicker"), {
        targetTextSelector: '[data-name="persianDatapicker-text"]',
        targetDateSelector: '[data-name="persianDatapicker-date"]',

        persianNumber : true,

        enableTimePicker: true,

        textFormat : "yyyy/MM/dd HH:mm:ss",

        dateFormat : "yyyy/MM/dd"
    });
    
});