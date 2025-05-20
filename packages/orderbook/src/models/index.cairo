//! Models

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct Book {
    #[key]
    pub id: u32,
    pub version: u8,
    pub paused: bool,
    pub counter: u32,
    pub owner: felt252,
}

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct Order {
    #[key]
    pub id: u32,
    pub category: u8,
    pub status: u8,
    pub expiration: u64,
    pub collection: felt252,
    pub token_id: u256,
    pub quantity: felt252,
    pub price: felt252,
    pub currency: felt252,
    pub owner: felt252,
}
