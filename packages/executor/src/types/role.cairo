#[derive(Copy, Drop, PartialEq)]
pub enum Role {
    None,
    Default,
    Broker,
    Creator,
    Team,
}

// Implementations

pub impl IntoRoleU8 of core::traits::Into<Role, u8> {
    #[inline]
    fn into(self: Role) -> u8 {
        match self {
            Role::None => 0,
            Role::Default => 1,
            Role::Broker => 2,
            Role::Creator => 3,
            Role::Team => 4,
        }
    }
}

pub impl IntoU8Role of core::traits::Into<u8, Role> {
    #[inline]
    fn into(self: u8) -> Role {
        match self {
            0 => Role::None,
            1 => Role::Default,
            2 => Role::Broker,
            3 => Role::Creator,
            4 => Role::Team,
            _ => Role::None,
        }
    }
}
