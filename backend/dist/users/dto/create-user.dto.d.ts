export declare class CreateUserDto {
    name: string;
    email: string;
    password?: string;
    roles?: ('ROLE_USER' | 'ROLE_SELLER' | 'ROLE_ADMIN')[];
    status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
    avatar?: string;
    phone?: string;
    shopName?: string;
    sellerTitle?: string;
    sellerBio?: string;
    sellerAbout?: string;
    sellerHeroImage?: string;
    sellerAboutImage?: string;
    sellerStat1Label?: string;
    sellerStat1Value?: string;
    sellerStat2Label?: string;
    sellerStat2Value?: string;
    isEmailVerified?: boolean;
}
