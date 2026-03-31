export declare class CreateUserDto {
    name: string;
    email: string;
    password: string;
    roles?: ('ROLE_USER' | 'ROLE_SELLER' | 'ROLE_ADMIN')[];
    status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
    avatar?: string;
    phone?: string;
    shopName?: string;
}
