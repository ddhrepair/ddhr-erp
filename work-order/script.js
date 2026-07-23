import { api } from '../script.js';

const partsList = [['1', 'Desc 1', 11.11], ['2', 'Desc 2', 22.22], ['3', 'Desc 3', 33.33]];

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

function addRowToTable() {
    // adds a new dynamic row to the parts table

    const table = document.querySelector("#woParts > table")
    const tbody = table.querySelector("tbody");
    const lastRow = tbody.lastElementChild;

    const newRow = document.createElement('tr');
    newRow.innerHTML = `<td><input type="number" step="0.01"></td>
                        <td><input type="text"></td>
                        <td><input type="text"></td>
                        <td class="empView"><input type="number" step="0.01"></td>
                        <td><input type="number" step="0.01"></td>
                        <td class="custView"><input type="number" step="0.01" disabled></td>
                        <td class="empView"><input type="number" step="0.01"></td>
                        <td><input type="checkbox"></td>`;

    // add 'change' event listeners to the table row
    const inputs = newRow.querySelectorAll("input");
    for (let i = 0; i < inputs.length; i++) {
        let column = inputs[i];
        console.log(column);
        column.addEventListener('change', e => recalculateRow(e));

        // also add the setValue() method to each cell
        column.setValue = function (newValue) {
            if (this.value !== String(newValue)) {
                this.value = newValue;
                // dispatch a new 'change' event
                this.dispatchEvent(new Event("change", { bubbles: true }));
            }
        };
    }

    tbody.insertBefore(newRow, lastRow);
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
        let num, desc, price;
        const part = partsList.find(row => row[0] === partNum);
        if (!part) {
            console.log("Undefined part number: " + partNum);
            num = partNum;
            desc = "";
            price = 0;
        } else {
            num = part[0];
            desc = part[1];
            price = part[2];
        }

        let partNumCell = getNamedColumn(parentRow, 'partNum');
        partNumCell.setValue(num);

        let descriptionCell = getNamedColumn(parentRow, 'description');
        descriptionCell.setValue(desc);

        let unitPriceCell = getNamedColumn(parentRow, 'unitPrice');
        unitPriceCell.setValue(Number(price).toFixed(2));
    }

    // if teh target cell is the pp cell
    if (e.target == getNamedColumn(parentRow, 'pp')) {
        const ppCell = getNamedColumn(parentRow, 'pp');
        console.log("pp cell value: " + ppCell.value)
    }
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

function toggleTableView() {
    const empStyle = getComputedStyle(document.documentElement).getPropertyValue("--empViewVisibility");
    console.log(empStyle);
    if (empStyle == "none") {
        // show employee columns
        document.documentElement.style.setProperty("--empViewVisibility", "table-cell");
        document.documentElement.style.setProperty("--custViewVisibility", "none");
        // change 'unit price' to 'sold'
        document.getElementById('up-sold').innerText = "Sold";
    } else {
        /// show customer columns
        document.documentElement.style.setProperty("--empViewVisibility", "none");
        document.documentElement.style.setProperty("--custViewVisibility", "table-cell");
        // change 'sold' to 'unit price'
        document.getElementById('up-sold').innerText = "Unit Price";
    }
}

function addEventListeners() {

    // add row button
    document.getElementById('addRowBtn').addEventListener('click', () => addRowToTable());
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

        // add the event listeners
        addEventListeners();

        // for (let i = 0; i < 20; i++) {
        //     addRowToTable();
        // }

        toggleTableView();


    } else {
        // send the user back to the main page to login
        window.location = "../";
    }

}

// run the main if on the work-order page
if (window.location.pathname == '/work-order/') {
    main();
}