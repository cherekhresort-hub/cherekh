import { Link, useParams } from 'react-router-dom'
import { FaArrowLeft, FaCalendar, FaUser } from 'react-icons/fa'
import { getBlogPostById } from '../data/blogPosts'
import NotFound from './NotFound'

const BlogPost = () => {
  const { id } = useParams<{ id: string }>()
  const post = id ? getBlogPostById(id) : undefined

  if (!post) return <NotFound />

  return (
    <article>
      <section className="relative h-72 md:h-96 flex items-end overflow-hidden">
        <img src={post.image} alt={post.title} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 w-full">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-white/90 hover:text-white text-sm mb-4"
          >
            <FaArrowLeft className="w-3.5 h-3.5" />
            Back to blog
          </Link>
          <span className="inline-block px-3 py-1 bg-resort-cta text-white rounded-full text-xs font-medium mb-3 capitalize">
            {post.category}
          </span>
          <h1 className="text-3xl md:text-5xl font-serif text-white leading-tight">{post.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-white/80 mt-4">
            <span className="inline-flex items-center gap-2">
              <FaUser className="w-3.5 h-3.5" />
              {post.author}
            </span>
            <span className="inline-flex items-center gap-2">
              <FaCalendar className="w-3.5 h-3.5" />
              {new Date(post.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>
      </section>

      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <p className="text-lg text-gray-700 leading-relaxed mb-8">{post.excerpt}</p>
          <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed whitespace-pre-line">
            {post.content}
          </div>
          <div className="mt-10 pt-8 border-t border-gray-200">
            <Link
              to="/booking"
              className="inline-flex items-center justify-center px-6 py-3 bg-resort-cta text-white rounded-full font-medium hover:bg-resort-cta/90 transition-colors"
            >
              Plan your stay
            </Link>
          </div>
        </div>
      </section>
    </article>
  )
}

export default BlogPost
