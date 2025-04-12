//! Models

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct Executor {
    #[key]
    pub id: felt252,
    pub status: u8,
    pub token: felt252,
    pub admin: felt252,
}

#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct Fee {
    #[key]
    pub id: felt252,
    #[key]
    pub role: u8,
    pub numerator: u16,
    pub denominator: u16,
    pub receiver: felt252,
}
