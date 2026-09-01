import { api } from '../script.js';

//const partsList = [['1', 'Desc 1', 11.11], ['2', 'Desc 2', 22.22], ['3', 'Desc 3', 33.33]];
let partsList;
let customerInfo;
let paymentHistory;
const tax = 0.06875;
const defaultCreditCardFee = 3.00;

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
            result.data.woInfo.wo
        );
        return result.data
    }

}

async function openWorkOrder(wo) {

    const result = await api(
        "openWorkOrder",
        {
            wo: wo
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
    url.searchParams.set('wo', data.woInfo.wo);
    window.history.replaceState({}, '', url);

    const loadingPage = document.getElementById('loginContainer');
    loadingPage.classList.add('hidden');

    // add the customer details to the page
    const cInfo = data.customerInfo;
    customerInfo = cInfo;
    console.log(customerInfo)
    document.getElementById('name').innerText = cInfo.name;
    document.getElementById('customerId').innerText = String(cInfo.customer_id).padStart(6, "0");
    document.getElementById('phone').innerText = cInfo.phone;
    document.getElementById('email').innerText = cInfo.email;
    document.getElementById('address').innerText = cInfo.address;
    document.getElementById('customerLevel').classList.add("level" + cInfo.customer_level);
    document.getElementById('colorCode').classList.add(cInfo.color_code || "red");
    document.getElementById('storeCredit').innerText = Number(cInfo.store_credit).toFixed(2);
    if (!cInfo.tax_exempt) {
        document.getElementById('taxExempt').innerText = "NO";
    } else {
        document.getElementById('taxExempt').innerText = "YES";
        let linkImage = document.getElementById('taxExemptFormLink');
        linkImage.classList.remove('hidden');
        linkImage.addEventListener('click', () => {
            open(cInfo.exempt_form_link, "_blank");
        });
    }

    // add the work order details to the page
    const woInfo = data.woInfo;
    document.getElementById('wo').innerText = woInfo.wo;
    document.getElementById('status').classList.add(woInfo.status);
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' };
    document.getElementById('dateCreated').innerText = new Intl.DateTimeFormat('en-US', dateOptions).format(new Date(woInfo.date_created));
    document.getElementById('lastModified').innerText = new Intl.DateTimeFormat('en-US', dateOptions).format(new Date(woInfo.last_modified));
    document.getElementById('notes').innerText = woInfo.notes;
    paymentHistory = woInfo.payment_history;
    handlePaymentHistory(paymentHistory);

    // also update the header
    const headerDiv = document.getElementById('headerInfo');
    //headerDiv.querySelector('div:nth-of-type(1)').innerText = woInfo.fileType;
    headerDiv.querySelector('div:nth-of-type(2)').innerText = "#" + woInfo.wo;
    headerDiv.querySelector('div:nth-of-type(3)').classList.add(woInfo.status);

}

function addRowToTable() {
    // adds a new dynamic row to the parts table

    const table = document.querySelector("#tableContainer > table")
    const tbody = table.querySelector("tbody");

    const newRow = document.createElement('tr');
    newRow.innerHTML = `<td><input type="number" step="0.01"></td>
                        <td><input type="text"></td>
                        <td><input type="text"></td>
                        <td class="empView"><input type="number" step="0.01"></td>
                        <td><input type="number" step="0.01"></td>
                        <td class="custView"><input type="number" step="0.01" disabled></td>
                        <td class="empView"><input type="number" step="0.01" disabled></td>
                        <td><input type="checkbox"></td>`;

    // add 'change' event listeners to the table row
    const inputs = newRow.querySelectorAll("input");
    for (let i = 0; i < inputs.length; i++) {
        let column = inputs[i];
        console.log(column);
        column.addEventListener('change', e => recalculateRow(e));
        column.addEventListener('keydown', e => moveCellOnKeydown(e));

        // also add the setValue() method to each cell
        column.setValue = function (newValue) {
            // only dispatch event when the value truly changes
            if (this.value !== String(newValue)) {
                this.value = newValue;
                // dispatch a new 'change' event
                this.dispatchEvent(new Event("change", { bubbles: true }));
            }

            // if the input if the pp checkbox, update the checked value no matter what
            if (this.type == "checkbox") {
                this.checked = newValue;
                this.dispatchEvent(new Event("change", { bubbles: true }));
            }
        };
    }

    tbody.appendChild(newRow);
    inputs[0].focus();
    document.querySelector("#addRowBtn").scrollIntoView();
}

function recalculateRow(e) {
    // fires when a value in a column of the specified row changes
    console.log('changed');
    console.log(e);
    const parentRow = e.target.parentNode.parentNode;

    // if the target cell is the quantity or the unitPrice cell
    if (e.target == getNamedColumn(parentRow, 'quantity') || e.target == getNamedColumn(parentRow, 'unitPrice')) {
        // recalculate the unit total
        let quantity = getNamedColumn(parentRow, 'quantity').value;
        let unitPriceCell = getNamedColumn(parentRow, 'unitPrice');
        unitPriceCell.value = Number(unitPriceCell.value).toFixed(2);
        let unitPrice = unitPriceCell.value;
        let unitTotal = Number(quantity * unitPrice).toFixed(2);
        let unitTotalCell = getNamedColumn(parentRow, 'unitTotal');
        unitTotalCell.setValue(unitTotal);

        // update tax cell by causing click event on PP cell
        let ppCell = getNamedColumn(parentRow, 'pp');
        ppCell.setValue(ppCell.checked);

    }

    // if the target cell is the unitTotal cell
    if (e.target == getNamedColumn(parentRow, 'unitTotal')) {
        console.log('unit total changed')
    }

    // if the target cell is the partNum cell
    if (e.target == getNamedColumn(parentRow, 'partNum')) {
        const partNum = getNamedColumn(parentRow, 'partNum').value;
        console.log("partNum: " + partNum);

        // lookup the part number
        let num, desc, price, bought;
        console.log(partsList);
        const part = partsList.find(row => row['partNumber'] === partNum);
        if (!part) {
            console.log("Undefined part number: " + partNum);
            num = partNum;
            desc = "";
            price = 0;
            bought = 0;
        } else {
            num = part['partNumber'];
            desc = part['description'];
            price = part['level1'];
            bought = part['ourPrice'];
        }

        let partNumCell = getNamedColumn(parentRow, 'partNum');
        partNumCell.setValue(num);

        let descriptionCell = getNamedColumn(parentRow, 'description');
        descriptionCell.setValue(desc);

        let unitPriceCell = getNamedColumn(parentRow, 'unitPrice');
        unitPriceCell.setValue(Number(price).toFixed(2));

        let boughtCell = getNamedColumn(parentRow, 'bought');
        boughtCell.setValue(Number(bought).toFixed(2));

        // update tax cell by causing click event on PP cell
        let ppCell = getNamedColumn(parentRow, 'pp');
        ppCell.setValue(ppCell.checked);
    }

    // if the target cell is the pp cell
    if (e.target == getNamedColumn(parentRow, 'pp')) {
        const ppCell = getNamedColumn(parentRow, 'pp');
        const sold = getNamedColumn(parentRow, 'unitPrice').value;
        const bought = getNamedColumn(parentRow, 'bought').value;
        const quantity = getNamedColumn(parentRow, 'quantity').value;
        const taxCell = getNamedColumn(parentRow, 'tax');

        let taxRate = tax;
        if (customerInfo['Tax Exempt'] == true) {
            taxRate = 0;
        }

        let calculatedTax;
        if (ppCell.checked == true) {

            calculatedTax = ((sold - bought) * tax) * quantity;

        } else {

            calculatedTax = (sold * tax) * quantity;

        }

        taxCell.setValue(Number(calculatedTax).toFixed(2));
    }

    if (e.target == getNamedColumn(parentRow, 'bought')) {
        // format the value
        const boughtCell = getNamedColumn(parentRow, 'bought');
        boughtCell.value = Number(boughtCell.value).toFixed(2);
        // update tax cell by causing click event on PP cell
        const ppCell = getNamedColumn(parentRow, 'pp');
        ppCell.setValue(ppCell.checked);
    }

    // recalculate the totals
    calculateTotals();
}

function getNamedColumn(row, name) {
    // returns the index of the named column using 1 based indexing
    const tableOrder = {
        "quantity": 1,
        "partNum": 2,
        "description": 3,
        "bought": 4,
        "unitPrice": 5,
        "unitTotal": 6,
        "tax": 7,
        "pp": 8
    };

    let index = tableOrder[name];
    let cell = row.querySelector(`td:nth-child(${index}) > input`);
    return cell;
}

function moveCellOnKeydown(e) {
    // fires when a key is pressed when in the input fields of the table
    console.log(e);

    if ((e.key == "Enter" && e.shiftKey == false) || e.key == "ArrowDown") {
        e.preventDefault();
        // go to the next row
        const parent = e.target.parentNode.parentNode;
        const index = Array.from(parent.children).indexOf(e.target.parentNode);

        let nextRow = parent.nextElementSibling;
        // if the next row is the row with the add button
        if (nextRow == null) {
            addRowToTable();
            // reassign next row to the newly created row
            nextRow = parent.nextElementSibling;
        }

        // get the child of the next row at the proper index
        const nextCell = nextRow.children[index].children[0];
        nextCell.focus();

        return;
    }

    if (e.key == "Tab" || e.key == "ArrowRight") {
        e.preventDefault();
        // go to the next column
        const parent = e.target.parentNode.parentNode;
        const index = Array.from(parent.children).indexOf(e.target.parentNode);
        let nextIndex = index + 1;
        while (nextIndex < parent.children.length) {
            const nextChild = parent.children[nextIndex];
            const style = getComputedStyle(nextChild);
            if (style.display == "none" || nextChild.children[0].disabled) {
                nextIndex += 1;
            } else {
                nextChild.children[0].focus();
                return;
            }
        }
        addRowToTable();

        return;
    }

    if (e.key == "ArrowUp") {
        e.preventDefault();
        // go to the previous row
        const parent = e.target.parentNode.parentNode;
        const index = Array.from(parent.children).indexOf(e.target.parentNode);

        let prevRow = parent.previousElementSibling;
        // if the previous row is the header, do nothing
        if (prevRow == null) {
            return;
        }

        // get the child of the previous row at the proper index
        const prevCell = prevRow.children[index].children[0];
        prevCell.focus();

        return;
    }

    if (e.key == "ArrowLeft") {
        e.preventDefault();
        // go to the next column
        const parent = e.target.parentNode.parentNode;
        const index = Array.from(parent.children).indexOf(e.target.parentNode);
        let prevIndex = index - 1;
        while (prevIndex >= 0) {
            const prevChild = parent.children[prevIndex];
            const style = getComputedStyle(prevChild);
            if (style.display == "none" || prevChild.children[0].disabled) {
                prevIndex -= 1;
            } else {
                prevChild.children[0].focus();
                return;
            }
        }

        // go to the previous row's last column
        let prevRow = parent.previousElementSibling;
        // if the previous row is the header, do nothing
        if (prevRow == null) {
            return;
        }

        // get the child of the previous row at the proper index
        const lastIndex = prevRow.children.length - 1;
        const prevCell = prevRow.children[lastIndex].children[0];
        prevCell.focus();

        return;
    }

}

function toggleTableView() {
    const empStyle = getComputedStyle(document.documentElement).getPropertyValue("--empViewVisibility");
    console.log(empStyle);
    if (empStyle == "none") {
        // show employee columns
        document.documentElement.style.setProperty("--empViewVisibility", "table-cell");
        document.documentElement.style.setProperty("--custViewVisibility", "none");
        // change 'unit price' to 'sold'
        document.getElementById('up-sold').innerText = "Sold";
        // change visibility icon
        document.getElementById('tableVisibilityBtn').setAttribute('src', '../images/general/visibility.svg');
    } else {
        /// show customer columns
        document.documentElement.style.setProperty("--empViewVisibility", "none");
        document.documentElement.style.setProperty("--custViewVisibility", "table-cell");
        // change 'sold' to 'unit price'
        document.getElementById('up-sold').innerText = "Unit Price";
        // change visibility icon
        document.getElementById('tableVisibilityBtn').setAttribute('src', '../images/general/visibility_off.svg');
    }
}

function calculateTotals() {
    // calculate the parts subtotal, tax, and additional charges

    let totalAdditionalCharges, overallTotal;
    totalAdditionalCharges = overallTotal = 0;

    // calculate the parts and tax totals
    const { partsSubtotal: partsSubtotal, totalTax: totalTax } = calculateParts();

    // calculate the ccFee
    calculateCreditCardFee();

    // calculate the shop supplies
    calculateShopSupplies();

    // calculate the additional charges
    const additionalChargesElements = document.querySelectorAll('#additionalCharges .price input');
    for (const element of additionalChargesElements) {
        totalAdditionalCharges += Number(element.value);
    }

    // calculate the overall total and set the results on the page
    overallTotal = partsSubtotal + totalTax + totalAdditionalCharges;

    const subtotalElement = document.getElementById('subTotal');
    const taxElement = document.getElementById('tax');
    const additionalChargesElement = document.getElementById('additionalChargesTotal');
    const totalElement = document.getElementById('total');

    subtotalElement.innerText = Number(partsSubtotal).toFixed(2);
    taxElement.innerText = Number(totalTax).toFixed(2);
    additionalChargesElement.innerText = Number(totalAdditionalCharges).toFixed(2);
    totalElement.innerText = Number(overallTotal).toFixed(2);

    // recalculate the outstanding balance
    calculateOutstandingBalance(overallTotal);
}

function calculateParts() {
    // calculate the parts and tax totals

    let partsSubtotal = 0;
    let totalTax = 0;

    const rows = document.querySelectorAll("#tableContainer > table > tbody > tr");
    for (const row of rows) {
        const unitTotal = Number(row.querySelector("td:nth-of-type(6) > input").value);
        const tax = Number(row.querySelector("td:nth-of-type(7) > input").value);

        partsSubtotal += unitTotal;
        totalTax += tax;
    }

    return {
        "partsSubtotal": partsSubtotal,
        "totalTax": totalTax
    };

}

function calculateLabor(e) {
    // calculates the labor depending on which input the event originated from

    const hoursElement = document.getElementById('laborHours');
    const rateElement = document.getElementById('laborRate');
    const laborElement = document.getElementById('labor');

    // calculate the total labor of the hours or rate was changed
    if (e.target == hoursElement || e.target == rateElement) {
        const product = hoursElement.value * rateElement.value;
        laborElement.value = Number(product).toFixed(2);
    }

    // clear the hours and rate if the labor was changed
    if (e.target == laborElement) {
        hoursElement.value = "";
        rateElement.value = "";
    }

    // recalculate the totals
    calculateTotals();

}

function calculateCreditCardFee(e) {
    // calculates the credit card fee if the checkbox is checked

    // prevent errors if called from another function
    if (!e) {
        e = {};
        e.target = null;
    }

    const ccFee = document.getElementById('ccFee');
    const ccFeeCheckbox = document.getElementById('ccFeeCheckbox');
    const ccFeePercentage = document.getElementById('ccFeePercentage');

    // change the percentage and checkbox if the user manually inputs the fee
    if (e.target == ccFee) {

        ccFeeCheckbox.checked = true;
        ccFeePercentage.value = "";

    } else {

        // change back to the default cc fee if it is blank and the user changed the checkbox
        if (e.target == ccFeeCheckbox && ccFeeCheckbox.checked && ccFeePercentage.value == "") {
            ccFeePercentage.value = Number(defaultCreditCardFee).toFixed(2);
        }

        // only calculate the fee if the percentage has a value, or if the checkbox is unchecked
        if (ccFeePercentage.value || !ccFeeCheckbox.checked) {

            // calculate the cc fee
            const percentage = Number(ccFeePercentage.value) * 0.01;
            const labor = Number(document.getElementById('labor').value);
            const shopSupplies = Number(document.getElementById('shopSupplies').value);
            const externalWork = Number(document.getElementById('externalWork').value);
            const planeAndDegreaseHeads = Number(document.getElementById('planeAndDegreaseHeads').value);
            // calculate the parts and tax totals
            const { partsSubtotal: partsSubtotal, totalTax: totalTax } = calculateParts();
            const isChecked = Number(ccFeeCheckbox.checked);

            const fee = isChecked * (percentage * (labor + shopSupplies + externalWork + planeAndDegreaseHeads + partsSubtotal + totalTax));
            ccFee.value = Number(fee).toFixed(2);

        }

    }

    // calculate the totals if the target element exists
    if (e.target) {
        calculateTotals();
    }
}

function calculateShopSupplies(e) {
    // calculates the shop supplies for the additional charges

    // prevent errors if called from another function
    if (!e) {
        e = {};
        e.target = null;
    }

    const shopSuppliesPercentage = document.getElementById('shopSuppliesPercentage');
    const shopSupplies = document.getElementById('shopSupplies');

    // if the shopSupplies were changed manually, clear the percentage
    if (e.target == shopSupplies) {
        shopSuppliesPercentage.value = "";

    } else {
        // only calculate the shop supplies if the percentage input has a value
        if (shopSuppliesPercentage.value) {

            // calculate the shop supplies by multiplying the percentage by the labor
            const percentage = Number(shopSuppliesPercentage.value) * 0.01;
            const labor = Number(document.getElementById('labor').value);
            const product = percentage * labor;
            shopSupplies.value = Number(product).toFixed(2);

        }

    }

    // calculate the totals if the target element exists
    if (e.target) {
        calculateTotals();
    }
}

function handlePaymentHistory(history) {
    // displays the payment history and calculates the outstanding balance

    if (!history) {
        console.log('no history');
        return;
    }

    console.log(history);
}

function calculateOutstandingBalance(woTotal) {
    // takes the wo total and other payments and calculates the outstanding balance

    const outstandingLabel = document.querySelector("#outstanding > div.price");
    outstandingLabel.innerText = Number(woTotal).toFixed(2);
}

function displayPaymentCard(details) {
    // displays a payment card under the payment history section of the work order details

    details = {
        date: "2026-08-23T16:30:00.000Z",
        amount: 100
    };

    // make sure that the noPaymentHistory element is hidden
    const noPaymentHistory = document.getElementById('noPaymentHistory');
    noPaymentHistory.classList.add('hidden');

    const newElement = document.createElement('div');
    newElement.classList.add('paymentCard');

    const dateOptions = { year: 'numeric', month: 'numeric', day: 'numeric' };
    const formattedDate = new Intl.DateTimeFormat('en-US', dateOptions).format(new Date(details.date));
    const formattedAmount = Number(details.amount).toFixed(2);

    newElement.innerHTML = `
                            <div>${formattedDate}</div>
                            <div class="price">${formattedAmount}</div>
                            `;

    const container = document.getElementById('paymentHistoryContainer');
    container.appendChild(newElement);
}

function openStatusDropdown(e) {
    // show the dropdown menu for the status buttons

    e.stopPropagation();

    const dropdown = document.getElementById('statusDropdown');
    const chevron = document.querySelector('#status .chevron');

    dropdown.classList.toggle('show');
    chevron.classList.toggle('open');

    document.addEventListener('click', (e) => {
        // check to see if the target is outside of the dropdown

        dropdown.classList.remove('show');
        chevron.classList.remove('open');
        const status = e.target.parentNode.getAttribute('data-status');

        // if a status button was clicked, change the status
        if (dropdown.contains(e.target) && status != null) {
            changeWoStatus(status, e);
        }

    }, { once: true });

}

function changeWoStatus(status, e) {
    // changes the status of the work order to the specified value

    const statusBtn = document.getElementById('status');

    // only change the status if it is switched by the user
    if (statusBtn.classList.contains(status)) {
        return;
    }

    const statuses = ['open', 'paid', 'partial', 'quote'];
    const headerStatus = document.querySelector('#headerInfo>div:nth-of-type(3)');
    const statusElement = document.getElementById('status');
    headerStatus.classList.remove(...statuses);
    statusElement.classList.remove(...statuses);
    headerStatus.classList.add(status);
    statusElement.classList.add(status);

    const color = getComputedStyle(statusBtn).getPropertyValue('--accent').trim();
    setFavicon(color);
}

async function setFavicon(color) {
    const response = await fetch('../images/general/document.svg');
    let svg = await response.text();

    svg = svg.replace(/fill="[^"]*"/g, `fill="${color}"`);

    const favicon = document.querySelector('link[rel="icon"]');

    favicon.href =
        'data:image/svg+xml,' + encodeURIComponent(svg);
}

async function saveWorkOrder(e) {
    // gathers all of the information about the work order and saves it to the cloud

    console.log('saving...');
    const successElement = document.querySelector('#cloudSyncStatus .success');
    const loadingElement = document.querySelector('#cloudSyncStatus .loading');
    const errorElement = document.querySelector('#cloudSyncStatus .error');

    successElement.classList.add('hidden');
    loadingElement.classList.remove('hidden');

    // FIXME: instead of timeout, use real saving logic with error handling
    setTimeout(() => {
        loadingElement.classList.add('hidden');
        successElement.classList.remove('hidden');
        successElement.querySelector('span').classList.remove('hidden');
        setTimeout(() => {
            successElement.querySelector('span').classList.add('hidden');
        }, 5000);
    }, 5000);
}

function addEventListeners() {

    // add row button
    document.getElementById('addRowBtn').addEventListener('click', () => addRowToTable());

    // add table column visibility toggle to image
    document.getElementById('tableVisibilityBtn').addEventListener('click', () => toggleTableView());

    // add value verification to the additional charges inputs
    const additionalChargesElements = document.querySelectorAll('#additionalCharges input');
    for (const element of additionalChargesElements) {
        element.addEventListener('change', (e) => {
            e.target.value = Number(e.target.value).toFixed(2);
        });
    }

    // add total calculation listeners to the additional charges inputs
    const otherChargesInputs = document.querySelectorAll('#additionalCharges .price input:not(#labor, #ccFee, #shopSupplies');
    for (const element of otherChargesInputs) {
        element.addEventListener('change', () => calculateTotals());
    }

    // add different calculateLabor function to the labors specific inputs
    const laborElements = document.querySelectorAll('#laborHours, #laborRate, #labor');
    for (const element of laborElements) {
        element.addEventListener('change', e => calculateLabor(e));
    }

    // add different calculateCreditCardFee function to the ccFee specific inputs
    const ccFeeElements = document.querySelectorAll('#ccFee, #ccFeeCheckbox, #ccFeePercentage');
    for (const element of ccFeeElements) {
        element.addEventListener('change', e => calculateCreditCardFee(e));
    }

    // add different calculateShopSupplies function to the shopSupplies specific inputs
    const shopSuppliesElements = document.querySelectorAll('#shopSupplies, #shopSuppliesPercentage');
    for (const element of shopSuppliesElements) {
        element.addEventListener('change', e => calculateShopSupplies(e));
    }

    // monitor for when the status button is clicked
    document.getElementById('status').addEventListener('click', (e) => openStatusDropdown(e));

    // detect when the user presses command + s
    document.addEventListener('keydown', (e) => {
        if (e.key == "s" && e.metaKey) {
            e.preventDefault();
            saveWorkOrder(e);
        }
    });

}

async function getAllParts() {

    let response = await api('getAllParts');

    if (response.success) {
        partsList = response.data;
        return partsList;
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
            const wo = params.get('wo');
            workOrderData = await openWorkOrder(wo);

        } else {
            // send the user back to the main page to login
            window.location = "../";
        }

        displayWorkOrderData(workOrderData);

        // add the event listeners
        addEventListeners();

        // if workOrderData does not have any parts already, add a new row
        if (!workOrderData.woInfo['Parts & Prices']) {
            addRowToTable();
        }

        toggleTableView();

        // get a list of all the parts
        getAllParts();

        for (let i = 0; i < 0; i++) {
            addRowToTable();
        }

        displayPaymentCard();


    } else {
        // send the user back to the main page to login
        window.location = "../";
    }

}

// run the main if on the work-order page
if (window.location.pathname == '/work-order/') {
    main();
}