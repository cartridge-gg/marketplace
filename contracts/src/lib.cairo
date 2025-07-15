pub mod constants;

pub mod systems {
    pub mod marketplace;
}

#[cfg(test)]
mod tests {
    mod setup;
    mod test_setup;

    pub mod mocks {
        pub mod account;
        pub mod erc20;
        pub mod erc721;
        pub mod erc1155;
    }

    pub mod marketplace {
        pub mod erc721 {
            mod test_fees;
            mod test_intent_execute;
            mod test_list_execute;
            mod test_list_cancel;
            mod test_list_remove;
            mod test_offer_cancel;
            mod test_offer_execute;
            mod test_offer_remove;
        }
        pub mod erc1155 {
            mod test_fees;
            mod test_intent_execute;
            mod test_list_execute;
            mod test_list_cancel;
            mod test_list_remove;
            mod test_offer_cancel;
            mod test_offer_execute;
            mod test_offer_remove;
        }
    }
}
