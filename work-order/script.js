import { api } from '../script.js';

async function createWorkOrder(id) {

    const result = await api(
        "createWorkOrder",
        {
            id: id
        }
    );

    console.log(result);

    if (result.success) {
        console.log(
            "Created work order # " +
            result.data.woInfo.PO
        );
        return result.data
    }

}

async function openWorkOrder(po) {

    const result = await api(
        "openWorkOrder",
        {
            po: po
        }
    );

    console.log(result);

    if (result.success) {
        console.log(result.data);
        return result.data;
    }

}

function toCamelCase(str) {
    return str
        .trim()
        .split(/\s+/)
        .map((word, index) => {
            word = word.toLowerCase();

            return index === 0
                ? word
                : word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join("");
}

function displayWorkOrderData(data) {

    // adjust the url
    const url = new URL(window.location);
    url.searchParams.delete('create');
    url.searchParams.delete('id');
    url.searchParams.set('open', '1');
    url.searchParams.set('po', data.woInfo.PO);
    window.history.replaceState({}, '', url);

    const loadingPage = document.getElementById('loginContainer');
    loadingPage.classList.add('hidden');

    const cInfo = data.customerInfo;
    const otherCustomerInfo = document.getElementById('otherCustomerInfo');
    for (let key in cInfo) {
        if (key.startsWith("CC ")) {
            continue;
        }
        let value = cInfo[key];
        let id = toCamelCase(key);
        let element = document.getElementById(id);
        if (!element) {
            element = document.createElement('div');
            otherCustomerInfo.appendChild(element);
        }
        element.innerText = key + ": " + value;
    }

    const woInfo = data.woInfo;
    for (let key in woInfo) {
        let value = woInfo[key];
        let id = toCamelCase(key);
        let element = document.getElementById(id);
        if (!element) {
            console.log("No place for: " + key);
            continue;
        }
        element.innerText = key + ": " + value;
    }

}

async function main() {

    const sessionId = localStorage.getItem("sessionId");

    if (sessionId) {

        // get the details from the url
        const params = new URLSearchParams(window.location.search);

        const create = params.get('create');
        const open = params.get('open');

        let workOrderData;
        if (create) {
            const id = params.get('id');
            workOrderData = await createWorkOrder(id);

        } else if (open) {
            const po = params.get('po');
            workOrderData = await openWorkOrder(po);

        } else {
            // send the user back to the main page to login
            window.location = "../";
        }

        displayWorkOrderData(workOrderData);


    } else {
        // send the user back to the main page to login
        window.location = "../";
    }

}

// run the main if on the work-order page
if (window.location.pathname == '/work-order/') {
    main();
}