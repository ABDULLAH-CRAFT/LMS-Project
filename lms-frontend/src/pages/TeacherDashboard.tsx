import { useState } from 'react'; // local form state
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; // useQuery fetches data, useMutation sends data, useQueryClient lets us refresh the list after creating
import { api } from '../lib/axios'; // shared axios instance with token attached
import { createCourseSchema, type CreateCourseFormValues } from '../schemas/course.schema';
import type { Course } from '../types/course';

export default function TeacherDashboard() {
  const queryClient = useQueryClient(); // used to tell TanStack Query "refetch the courses list" after a successful create/publish

  const [formData, setFormData] = useState<CreateCourseFormValues>({ title: '', description: '', price: 0 }); // create-course form state
  const [errors, setErrors] = useState<Partial<Record<keyof CreateCourseFormValues, string>>>({}); // validation errors

  const coursesQuery = useQuery({ // fetches this teacher's own courses (including drafts)
    queryKey: ['my-courses'], // unique cache key — used below to invalidate/refresh this specific query
    queryFn: async () => {
      const response = await api.get<Course[]>('/courses/mine'); // token is attached automatically by the axios interceptor
      return response.data;
    },
  });

  const createMutation = useMutation({ // handles the create-course request
    mutationFn: async (data: CreateCourseFormValues) => {
      const response = await api.post<Course>('/courses', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-courses'] }); // tells TanStack Query this data is stale — triggers an automatic refetch, so the new course appears without a manual page reload
      setFormData({ title: '', description: '', price: 0 }); // clear the form after a successful submit
    },
  });

  const publishMutation = useMutation({ // handles publishing a specific course
    mutationFn: async (courseId: string) => {
      const response = await api.patch<Course>(`/courses/${courseId}/publish`); // no body needed, the ID is in the URL
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-courses'] }); // refresh the list so the status badge updates immediately
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = createCourseSchema.safeParse(formData); // validate before hitting the API
    if (!result.success) {
      const fieldErrors: typeof errors = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof CreateCourseFormValues;
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    createMutation.mutate(result.data);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8"> {/* page wrapper */}
      <h1 className="text-2xl font-semibold mb-6">My Courses</h1> {/* page heading */}

      {/* CREATE COURSE FORM */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow-sm mb-8 max-w-lg"> {/* the create-course card */}
        <h2 className="font-medium mb-4">Create a new course</h2>

        <input
          type="text"
          placeholder="Course title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })} // update just the title field, keep others unchanged
          className="w-full border rounded-lg px-4 py-2 text-sm mb-1"
        />
        {errors.title && <p className="text-red-500 text-xs mb-2">{errors.title}</p>}

        <textarea
          placeholder="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full border rounded-lg px-4 py-2 text-sm mb-1 mt-2" // textarea instead of input — descriptions are longer
          rows={3} // controls the visible height
        />
        {errors.description && <p className="text-red-500 text-xs mb-2">{errors.description}</p>}

        <input
            type="number"
            placeholder="Price"
            value={formData.price === 0 ? "" : formData.price}
            onChange={(e) =>
              setFormData({
                ...formData,
                price: e.target.value === "" ? 0 : Number(e.target.value),
              })
            }
            className="w-full border rounded-lg px-4 py-2 text-sm mb-1 mt-2"
            step="0.01"
          />
        {errors.price && <p className="text-red-500 text-xs mb-2">{errors.price}</p>}

        <button
          type="submit"
          disabled={createMutation.isPending} // prevents double-submitting while the request is in flight
          className="w-full bg-black text-white rounded-lg py-2 text-sm font-medium mt-3 disabled:opacity-50"
        >
          {createMutation.isPending ? 'Creating...' : 'Create Course'}
        </button>
      </form>

      {/* COURSE LIST */}
      <div className="max-w-lg"> {/* wrapper for the list below the form */}
        {coursesQuery.isLoading && <p className="text-sm text-gray-500">Loading your courses...</p>} {/* shown while the initial fetch is in progress */}

        {coursesQuery.data?.map((course) => ( // render one card per course once data has loaded
          <div key={course.id} className="bg-white rounded-xl p-4 shadow-sm mb-3 flex items-center justify-between"> {/* key is required by React for list rendering */}
            <div>
              <h3 className="font-medium">{course.title}</h3>
              <p className="text-xs text-gray-500">
                {course.price} RS · {/* middle dot separator, just styling */}
                <span className={course.status === 'published' ? 'text-green-600' : 'text-amber-600'}> {/* green if live, amber if still a draft */}
                  {' '}{course.status}
                </span>
              </p>
            </div>

            {course.status === 'draft' && ( // only show the publish button for courses that aren't live yet
              <button
                onClick={() => publishMutation.mutate(course.id)} // triggers the publish request for THIS specific course
                disabled={publishMutation.isPending}
                className="text-xs bg-black text-white px-3 py-1.5 rounded-full disabled:opacity-50"
              >
                Publish
              </button>
            )}
          </div>
        ))}

        {coursesQuery.data?.length === 0 && ( // shown only once loading is done AND there are genuinely no courses yet
          <p className="text-sm text-gray-500">You haven't created any courses yet.</p>
        )}
      </div>
    </div>
  );
}