export class Category {
  id: string;
  name: string;
  description: string;
  image?: string;
  productsCount: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}
