import mongoose, { Document, Schema } from 'mongoose';
import slugify from 'slugify';

export interface ICategory extends Document {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  parentId?: mongoose.Types.ObjectId;
  startingPrice: number;
  isActive: boolean;
  sortOrder: number;
  trending: boolean;
  trendingTags: string[];
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, lowercase: true },
    description: { type: String },
    icon: { type: String },
    parentId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    startingPrice: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    trending: { type: Boolean, default: false },
    trendingTags: [{ type: String }],
  },
  { timestamps: true }
);

categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ parentId: 1 });
categorySchema.index({ isActive: 1 });

categorySchema.pre('save', function (next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

export const Category = mongoose.model<ICategory>('Category', categorySchema);
