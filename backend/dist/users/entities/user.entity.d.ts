import { Address } from './address.entity';
export declare class User {
    id: string;
    name: string;
    email: string;
    password: string;
    roles: ('ROLE_USER' | 'ROLE_SELLER' | 'ROLE_ADMIN')[];
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
    avatar?: string;
    phone?: string;
    shopName?: string;
    ordersCount: number;
    totalSpent: number;
    products?: number;
    sales?: number;
    rating?: number;
    image?: string;
    createdAt: Date;
    updatedAt: Date;
    addresses?: Address[];
}
