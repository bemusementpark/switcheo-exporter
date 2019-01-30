import {ADDRESS_FETCH_ORDERS} from "../actions";
import {LAYOUT_RAISE_ERROR} from "../../layout/actions";

import {history} from "../../../store";

import {unsetLoading} from "../../layout/loading/unsetLoading";

import {convertOrders} from "../../../helpers/convertOrders";

export const fetchOrders = (resetLoading = false) => (dispatch, getState) => {

    const {addressHashed, addressType} = getState().address.address;

    if (addressHashed && addressType) {

        const contracts = getState().switcheo.contracts[addressType];
        const network = getState().switcheo.network;

        if (contracts) {

            fetchOrdersFromContracts(addressHashed, Object.values(contracts), network)
                .then((orders) => {

                    //merge orders from multiple contracts
                    orders = [].concat.apply([], orders);
                    orders = convertOrders(orders, getState().switcheo.tokens, getState().switcheo.contracts, getState().switcheo.tickers);

                    dispatch({
                        type: ADDRESS_FETCH_ORDERS,
                        orders
                    });

                    if (resetLoading) {
                        dispatch(unsetLoading())
                    }

                })
                .catch((err) => {
                    console.log(err);
                    dispatch({
                        type: LAYOUT_RAISE_ERROR,
                        message: `Could not fetch orders: ${err.message}`
                    });
                    if (resetLoading) {
                        dispatch(unsetLoading())
                    }
                    history.push("/")
                })

        } else {

            dispatch({
                type: LAYOUT_RAISE_ERROR,
                message: `Could not fetch orders: No contracts available for ${addressType}`
            });
            if (resetLoading) {
                dispatch(unsetLoading())
            }
            history.push("/")

        }

    } else {
        dispatch({
            type: LAYOUT_RAISE_ERROR,
            message: 'Could not fetch orders: No address is given'
        });
        if (resetLoading) {
            dispatch(unsetLoading())
        }
        history.push("/")
    }
};

/**
 * Fetches orders made by address from a single contract
 * @param addressHashed
 * @param contractHash
 * @param network
 * @returns {Promise<Response>}
 */
const fetchOrdersFromContract = async (addressHashed, contractHash, network) => {

    const requestUrl = `https://${network}.switcheo.network/v2/orders?address=${addressHashed}&contract_hash=${contractHash}`;
    return await fetch(requestUrl).then(res => res.json())

};

/**
 * Fetches orders made by address from a single contract bulkwise
 * @param addressHashed
 * @param contractHash
 * @param network
 * @returns {Promise<Array>}
 */
const fetchOrdersFromContractBulkwise = async (addressHashed, contractHash, network) => {

    const limit = 200;

    let hasResults = true;
    let beforeId = "";

    let fetchedOrders = [];

    while(hasResults) {
        let requestUrl = `https://${network}.switcheo.network/v2/orders?address=${addressHashed}&contract_hash=${contractHash}&limit=${limit}`;
        if(beforeId) {
            requestUrl += `&before_id=${beforeId}`
        }

        const response = await fetch(requestUrl).then(res => res.json());

        if(response.length) {
            fetchedOrders = [...fetchedOrders, ...response];
            if(response.length === limit) {
                beforeId = response[response.length-1].id;
            } else {
                return fetchedOrders
            }
        } else {
            return fetchedOrders
        }
    }

};

/**
 * Fetches orders from the given contract hashes
 * @param addressHashed
 * @param contractHashes
 * @param network
 * @returns {Promise<any[]>}
 */
const fetchOrdersFromContracts = async (addressHashed, contractHashes, network) => {
    return Promise.all(contractHashes.map((async (contractHash) => {
        /*await fetchOrdersFromContract(addressHashed, contractHash, network)
            .then((orders) => {
               if(orders) {
                   return orders
               }
            });*/

        return await fetchOrdersFromContractBulkwise(addressHashed, contractHash, network)
    })))
};
