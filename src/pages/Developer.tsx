import { motion } from 'framer-motion'
import {
  FaFacebook,
  FaInstagram,
  FaEnvelope,
  FaPhone,
  FaWhatsapp,
  FaCamera,
  FaLaptopCode,
  FaCode,
} from 'react-icons/fa'

const Developer = () => {
  const socialLinks = [
    {
      name: 'Facebook',
      url: 'https://www.facebook.com/malthasc',
      icon: FaFacebook,
      color: 'hover:bg-blue-600',
    },
    {
      name: 'Instagram',
      url: 'https://www.instagram.com/malthasphotographer',
      icon: FaInstagram,
      color: 'hover:bg-gradient-to-r hover:from-purple-500 hover:to-pink-500',
    },
    {
      name: 'WhatsApp',
      url: 'https://wa.me/8801601719735',
      icon: FaWhatsapp,
      color: 'hover:bg-green-500',
    },
    {
      name: 'Email',
      url: 'mailto:malthas.dev01@gmail.com',
      icon: FaEnvelope,
      color: 'hover:bg-red-500',
    },
    {
      name: 'Call',
      url: 'tel:+8801601719735',
      icon: FaPhone,
      color: 'hover:bg-emerald-500',
    },
  ]

  const skills = [
    { name: 'Web Development', icon: FaLaptopCode },
    { name: 'Photography', icon: FaCamera },
  ]

  const services = [
    {
      title: 'Web Design & Development',
      description: 'Modern, responsive websites focused on performance, clarity, and business goals.',
      icon: FaLaptopCode,
    },
    {
      title: 'Brand & Visual Storytelling',
      description:
        'Clean visuals and photography to present your brand in a more compelling and human way.',
      icon: FaCamera,
    },
    {
      title: 'End-to-End Project Delivery',
      description:
        'From planning to launch, with practical communication and reliable post-launch support.',
      icon: FaCode,
    },
  ]

  return (
    <div className="min-h-screen bg-resort-bg text-resort-heading">
      <section className="relative overflow-hidden bg-gradient-to-b from-white to-resort-bg">
        <div className="absolute inset-0 opacity-20">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, rgba(120,113,108,0.15), transparent 40%), radial-gradient(circle at 80% 30%, rgba(120,113,108,0.12), transparent 40%)",
            }}
          />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-14 md:py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="lg:col-span-4 flex justify-center lg:justify-start"
            >
              <div className="relative inline-block">
                <div className="w-40 h-40 md:w-48 md:h-48 rounded-full overflow-hidden border-4 border-white shadow-xl">
                  <img
                    src="/malthasPortfolio/malthasPhoto.jpg"
                    alt="Malthas Chakma"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-resort-cta rounded-full flex items-center justify-center shadow-lg">
                  <FaCode className="w-5 h-5 text-white" />
                </div>
              </div>
            </motion.div>

            <div className="lg:col-span-8 text-center lg:text-left">
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="inline-flex items-center rounded-full bg-resort-cta/10 text-resort-cta px-3 py-1 text-sm font-medium mb-3"
              >
                Developer Profile
              </motion.p>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.25 }}
                className="text-3xl md:text-5xl font-serif font-bold mb-3"
              >
                Malthas Chakma
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="text-lg md:text-xl text-resort-cta font-medium mb-5"
              >
                Full Stack Developer & Photographer
              </motion.p>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35 }}
                className="text-gray-700 leading-relaxed max-w-2xl"
              >
                I design and build user-focused digital experiences that are clean, fast, and easy
                to use. I also work with visual storytelling through photography to help brands
                connect with people in a meaningful way.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="flex flex-wrap gap-3 mt-6 justify-center lg:justify-start"
              >
                {skills.map((skill) => (
                  <div
                    key={skill.name}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cream border border-gray-200 text-sm"
                  >
                    <skill.icon className="w-4 h-4 text-resort-cta" />
                    <span className="font-medium text-resort-heading">{skill.name}</span>
                  </div>
                ))}
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-8 md:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {services.map((service, index) => (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="rounded-2xl bg-cream border border-gray-200 p-5 shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-resort-cta/10 text-resort-cta flex items-center justify-center mb-3">
                  <service.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-resort-heading mb-2">{service.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{service.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-10 md:py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-resort-heading text-white rounded-3xl p-6 md:p-10"
          >
            <div className="max-w-3xl">
              <h2 className="text-2xl md:text-3xl font-serif font-semibold mb-3">Let's work together</h2>
              <p className="text-white/80 mb-6">
                Planning a website, redesign, or brand-focused digital project? Let's discuss your
                ideas and build something meaningful.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="mailto:malthas.dev01@gmail.com"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-cream text-resort-heading rounded-full font-medium hover:bg-cream/90 transition-colors"
              >
                <FaEnvelope className="w-4 h-4" />
                Email
              </a>
              <a
                href="https://wa.me/8801601719735"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-full font-medium hover:bg-green-700 transition-colors"
              >
                <FaWhatsapp className="w-4 h-4" />
                WhatsApp
              </a>
              <a
                href="tel:+8801601719735"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-white/30 text-white rounded-full font-medium hover:bg-white/10 transition-colors"
              >
                <FaPhone className="w-4 h-4" />
                Call
              </a>
            </div>

            <div className="mt-8 pt-6 border-t border-white/20">
              <p className="text-sm text-white/70 mb-3">Find me on</p>
              <div className="flex flex-wrap gap-3">
                {socialLinks.map((link, index) => (
                  <motion.a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: index * 0.06 }}
                    whileHover={{ y: -2 }}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/25 text-white text-sm ${link.color} transition-colors`}
                  >
                    <link.icon className="w-4 h-4" />
                    {link.name}
                  </motion.a>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="py-7 text-center text-gray-500 border-t border-gray-200">
        <p>&copy; {new Date().getFullYear()} Malthas Chakma. All rights reserved.</p>
      </div>
    </div>
  )
}

export default Developer

