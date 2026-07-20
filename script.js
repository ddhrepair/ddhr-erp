let customersDict;
let pinnedCustomers;

function prepForPrinting() {
    // gathers info needed for a work order and formats it nicely for printing

    // clear the print area first
    const printArea = document.getElementById('printArea');
    printArea.innerHTML = "";

    // determine if the customer copy, the business copy, or both should be printed
    const copyType = 0

    // itemize the items in the itemsTable
    const itemsJSON = itemizeItemsTable();

    // create the desired copies
    if (copyType == 2) {
        // print both
        generatePrintableCopy(0, itemsJSON);
        generatePrintableCopy(1, itemsJSON);
    } else {
        generatePrintableCopy(copyType, itemsJSON);
    }

    // print the desired copies
    print();
}

function generatePrintableCopy(copyType, itemsJSON) {
    // generate the customer or business copy for printing

    // find the print area
    const printArea = document.getElementById('printArea');

    // create a new file in the print area
    let file = document.createElement('div');
    printArea.appendChild(file);
    let page = createPage(copyType);
    let body = page.querySelector('tbody');

    // FIXME
    // parse the items data to generate the printable copy
    for (let i = 0; i < itemsJSON.length; i++) {
        body.appendChild(createRow(i));

        if (page.scrollHeight > page.clientHeight) {
            body.removeChild(body.lastChild);

            page = createPage();
            body = page.querySelector('tbody');
            body.appendChild(createRow(i));
        }
    }

    // write the page numbers onto the page
    const totalPages = file.children.length;
    for (let i = 0; i < totalPages; i++) {
        let pageNum = i + 1;
        let page = file.children[i];
        let element = page.querySelector('pageNum');
        element.innerText = "Page " + pageNum + " of " + totalPages;
    }

    // write customer info and other data to the file
    console.log('add other data');
}












const GAS_URL =
    "https://script.google.com/macros/s/AKfycbyLfVcBjN_qamrmPBMrKGersdByG-sxj9onctP1nXo-yQN3n6Vq7PNzQt30jfxM6mlw/exec";

const CLIENT_ID =
    "592400205396-2tpv0i6d07a8643q8qu2qtapcgmc95ir.apps.googleusercontent.com";

/*
    Called when Google authentication succeeds.
*/
async function handleGoogleLogin(response) {

    try {

        const googleToken = response.credential;
        console.log(googleToken);

        const result = await fetch(GAS_URL, {
            method: "POST",
            body: JSON.stringify({
                action: "login",
                token: googleToken
            })
        });

        console.log("result:");
        console.log(result);

        const data = await result.json();

        if (!data.success) {
            alert(data.error);
            return;
        }

        /*
            Save session locally.
    
            This is the session generated
            by GAS after successful login.
        */
        localStorage.setItem(
            "sessionId",
            data.sessionId
        );

        document.getElementById(
            "loginContainer"
        ).classList.add('hidden');


    }
    catch (err) {

        console.error(err);

        alert("Login failed");
    }
}

/*
    Generic API helper.

    Every request automatically includes
    the current session.
*/
async function api(action, payload = {}) {

    const sessionId =
        localStorage.getItem("sessionId");

    const response = await fetch(GAS_URL, {

        method: "POST",
        body: JSON.stringify({
            action,
            sessionId,
            ...payload
        })

    });

    return await response.json();
}

/*
    Example UI action.
*/
async function requestCreateWorkOrder(id) {

    const button = document.getElementById('createWorkOrder');
    button.classList.add('disabled');

    let customerId;
    if (id != undefined) {
        customerId = id;
    } else {
        customerId = getSelectedCustomer();
    }

    if (customerId == undefined) {
        let element = document.getElementById('customerSelectErrorText');
        element.classList.remove('hidden');
        button.classList.remove('disabled');
        return;
    }

    window.open("work-order?create=1&id=" + customerId, "_blank");
    button.classList.remove('disabled');
    return;

    const result = await api(
        "createWorkOrder",
        {
            customerName: "John Smith",
            description: "Replace front tire"
        }
    );

    console.log(result);

    if (result.success) {
        alert(
            "Created work order #" +
            result.workOrderId
        );
    }
}

function getSelectedCustomer() {
    // gets the customer from the existing customer dropdown

    // check to see if the input is valid
    const inputText = document.getElementById("customerSelect").value;
    const optionElements = document.querySelectorAll("#customers option");

    for (let i = 0; i < optionElements.length; i++) {
        let optionElement = optionElements[i];
        if (optionElement.value === inputText) {
            return parseInt(optionElement.getAttribute('customer-id'));
        }
    };

    return;
}

async function getAllCustomers() {

    const result = await api(
        "getAllCustomers",
        {}
    );

    console.log(result);

    if (result.success) {
        return result.data;
    }
}

async function getPinnedCustomers() {

    const result = await api(
        "getPinnedCustomers",
        {}
    );

    console.log(result);

    if (result.success) {
        return result.data;
    }
}

function logout() {
    // removes the session id and refreshes the page
    localStorage.removeItem("sessionId");
    location.reload();
}


function addCustomersToDropdown(dict) {

    console.log(dict)

    const dataList = document.getElementById('customers');

    // sort the customers alphabetically by name
    const sorted = Object.entries(dict).sort((a, b) => a[1].Name.localeCompare(b[1].Name));
    console.log(sorted);

    for (let i = 0; i < sorted.length; i++) {
        let key = sorted[i][0];
        let value = sorted[i][1];
        let name = value['Name'];
        let phone = value['Phone'];
        let string = name + "     —     " + phone;
        let element = document.createElement('option');
        element.setAttribute('value', string);
        element.setAttribute('customer-id', key);
        dataList.appendChild(element);
    }
}

function addCustomersToPinned2(list, customersDict) {
    // adds the specified customers to the pinned section

    const container = document.getElementById('pinnedCustomers');

    for (let i = 0; i < list.length; i++) {
        let newElem = document.createElement('div');
        newElem.classList.add('button');
        let pElem = document.createElement('p');
        pElem.innerText = customersDict[list[i]]['Name'];
        let imgElem = document.createElement('img');
        imgElem.setAttribute('src', 'images/general/add.svg');
        newElem.appendChild(pElem);
        newElem.appendChild(imgElem);
        let customerId = list[i];
        console.log(customerId);
        newElem.addEventListener('click', function () {
            console.log(customerId);
            requestCreateWorkOrder(customerId);
        });
        container.appendChild(newElem);
    }
}

function addCustomersToPinned(list, customersDict) {
    // adds the specified customers to the pinned section

    const container = document.getElementById('pinnedCustomers');

    for (let i = 0; i < list.length; i++) {
        let name = customersDict[list[i]]['Name'];
        let customerId = list[i];
        let newElem = document.createElement('div');
        newElem.classList.add('button');
        newElem.draggable = true; // make the button able to move around
        newElem.innerHTML = `
            <p>${name}</p>
            <img src="images/general/add.svg">
            <img class="deleteIcon" src="images/general/delete.svg">
        `;
        newElem.addEventListener('click', function (e) {
            // delete the element if the delete icon is pressed
            if (e.target.matches('.deleteIcon')) {
                newElem.remove();
                pinnedCustomers.splice(pinnedCustomers.indexOf(customerId), 1);
                return;
            }
            // do not create a new work order if it is in editing mode
            if (container.classList.contains('editing')) {
                return;
            }
            // create a new work order
            requestCreateWorkOrder(customerId);
        });
        container.appendChild(newElem);
    }
}

function pinCustomerToRegulars() {

    let customerId = getSelectedCustomer();
    if (customerId == undefined) {
        return;
    }

    if (!pinnedCustomers.includes(customerId)) {
        pinnedCustomers.push(customerId);
        addCustomersToPinned([customerId], customersDict);
        savePinnedCustomers();
        return;
    }

}

function editPinnedCustomers() {

    const button = document.getElementById('editPinnedCustomersBtn');
    const container = document.getElementById('pinnedCustomers');

    // if the container is already in editing mode, exit and save
    if (button.src.includes('check_circle.svg')) {
        button.src = "images/general/edit.svg";
        container.classList.remove('editing');
        savePinnedCustomers();
        return;
    }

    button.src = "images/general/check_circle.svg";
    container.classList.add('editing');
}

async function savePinnedCustomers() {

    const result = await api(
        "savePinnedCustomers",
        { pinnedCustomers: pinnedCustomers }
    );

    console.log(result);

    if (result.success) {
        return result.data;
    }

}

function addEventListeners() {

    // logout button
    document.getElementById('logoutBtn').addEventListener('click', () => logout());

    // create work order button
    document.getElementById('createWorkOrderBtn').addEventListener('click', () => requestCreateWorkOrder());

    // pin customer button
    document.getElementById('pinCustomerBtn').addEventListener('click', () => pinCustomerToRegulars());

    // edit pinned customers button
    document.getElementById('editPinnedCustomersBtn').addEventListener('click', () => editPinnedCustomers());

    // CASH SALES button
    document.getElementById('cashSalesBtn').addEventListener('click', () => requestCreateWorkOrder(0));
}

async function main() {

    const sessionId = localStorage.getItem("sessionId");

    if (sessionId) {

        // hide the sign in div
        document.querySelector("#loginContainer > div > div:nth-of-type(1)").classList.add('hidden');
        document.querySelector("#loginContainer > div > div:nth-of-type(2)").classList.remove('hidden');
        document.querySelector("#loginContainer > div > div:nth-of-type(3)").classList.add('hidden');

        const result = await api(
            "validateSession"
        );

        if (result.success) {

            document.getElementById(
                "loginContainer"
            ).classList.add('hidden');

        } else {
            localStorage.removeItem("sessionId");
        }


    } else {
        // hide the signing in div
        document.querySelector("#loginContainer > div > div:nth-of-type(2)").classList.add('hidden');
        document.querySelector("#loginContainer > div > div:nth-of-type(1)").classList.add('hidden');
        document.querySelector("#loginContainer > div > div:nth-of-type(3)").classList.remove('hidden');

        // render Google Sign-In button once the page loads
        window.onload = async function () {

            // unhide the sign in div
            document.querySelector("#loginContainer > div > div:nth-of-type(1)").classList.remove('hidden');
            document.querySelector("#loginContainer > div > div:nth-of-type(3)").classList.add('hidden');

            google.accounts.id.initialize({
                client_id: CLIENT_ID,
                callback: handleGoogleLogin
            });

            google.accounts.id.renderButton(
                document.getElementById(
                    "googleLoginButton"
                ),
                {
                    theme: "outline",
                    size: "large"
                }
            );
        };
    }

    // add event listeners to all of the buttons and stuff
    addEventListeners();

    // add customer info to the customers dropdown
    customersDict = await getAllCustomers();
    addCustomersToDropdown(customersDict);

    pinnedCustomers = await getPinnedCustomers();
    addCustomersToPinned(pinnedCustomers, customersDict);

}

let draggedElement = null;

document.addEventListener('dragstart', (e) => {
    if (!e.target.matches('#pinnedCustomers > div')) return;
    draggedElement = e.target;
    draggedElement.classList.add('dragging');
    document.body.classList.add('dragging');
});

document.addEventListener('dragend', () => {
    if (draggedElement) {
        draggedElement.classList.remove('dragging');
        document.body.classList.remove('dragging');
        draggedElement = null;
    }
});

document.addEventListener('dragover', (e) => {
    e.preventDefault();
});

document.addEventListener('drop', (e) => {
    e.preventDefault();

    const container = document.getElementById('pinnedCustomers');
    const cashSalesBtn = document.getElementById('cashSalesBtn');

    const target = e.target.closest('#pinnedCustomers > div');

    if (!target || !draggedElement || target === draggedElement || target === cashSalesBtn) {
        return;
    }

    container.insertBefore(draggedElement, target);
});

// run main() if on main page
if (window.location.pathname == '/') {
    main();
}

export { api };