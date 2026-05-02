import { prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/utils';
import { Star } from 'lucide-react';
import Image from 'next/image';

export const metadata = {
  title: 'Manage Reviews | Admin Portal',
};

export default async function ReviewsPage() {
  const reviews = await prisma.review.findMany({
    take: 50,
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          avatarUrl: true
        }
      },
      attraction: { select: { name: true } },
      accommodation: { select: { name: true } },
      restaurant: { select: { name: true } }
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reviews Management</h1>
          <p className="text-gray-500">View latest user reviews</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left">
                <th className="px-6 py-4 font-semibold text-gray-900 text-sm">User</th>
                <th className="px-6 py-4 font-semibold text-gray-900 text-sm">Target</th>
                <th className="px-6 py-4 font-semibold text-gray-900 text-sm">Rating</th>
                <th className="px-6 py-4 font-semibold text-gray-900 text-sm">Comment</th>
                <th className="px-6 py-4 font-semibold text-gray-900 text-sm">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reviews.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No reviews found.
                  </td>
                </tr>
              ) : (
                reviews.map((review) => {
                  const targetName = 
                    review.attraction?.name || 
                    review.accommodation?.name || 
                    review.restaurant?.name || 
                    'Unknown';
                  
                  const targetType = 
                    review.attraction ? 'Attraction' : 
                    review.accommodation ? 'Accommodation' : 
                    review.restaurant ? 'Restaurant' : 
                    '-';

                  return (
                    <tr key={review.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gray-200 overflow-hidden relative">
                            {review.user.avatarUrl ? (
                              <Image 
                                src={review.user.avatarUrl} 
                                alt={review.user.name} 
                                fill 
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full w-full bg-brand text-white font-bold text-xs">
                                {review.user.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{review.user.name}</p>
                            <p className="text-xs text-gray-500">{review.user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900 text-sm">{targetName}</p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 mt-1">
                          {targetType}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-bold text-gray-900">{review.rating}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-600 text-sm line-clamp-2 max-w-md" title={review.comment || ''}>
                          {review.comment || '-'}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-500">{formatDate(review.createdAt)}</p>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
