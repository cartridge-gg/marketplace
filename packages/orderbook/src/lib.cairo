pub mod constants;
pub mod store;

pub mod types {
    pub mod category;
    pub mod role;
    pub mod status;
}

pub mod events {
    pub mod index;
    pub mod listing;
    pub mod sale;
    pub mod offer;
}

pub mod models {
    pub mod index;
    pub mod access;
    pub mod book;
    pub mod order;
}

pub mod components {
    pub mod buyable;
    pub mod manageable;
    pub mod sellable;
    pub mod verifiable;
}

#[cfg(test)]
mod tests {
    pub mod setup;
    pub mod test_marketplace;

    pub mod mocks {
        pub mod account;
        pub mod erc20;
        pub mod erc721;
        pub mod erc1155;
        pub mod marketplace;
    }
}
