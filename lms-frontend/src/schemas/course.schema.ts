import { z } from 'zod';

export const createCourseSchema = z.object({ // mirrors the backend's CreateCourseDto validation rules
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  price: z.coerce.number().min(0, 'Price cannot be negative'), // coerce converts the string from an <input> into a number automatically
});

export type CreateCourseFormValues = z.infer<typeof createCourseSchema>;