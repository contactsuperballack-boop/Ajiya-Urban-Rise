#let charcoal = rgb("#1B2621")
#let canopy = rgb("#1D4A3A")
#let limestone = rgb("#F2EEE4")
#let stone = rgb("#E2DED3")
#let bronze = rgb("#B48D58")

#set page(paper: "a4", margin: (top: 22mm, bottom: 20mm, left: 20mm, right: 20mm), fill: limestone)
#set text(font: "Noto Sans", size: 10pt, fill: charcoal, lang: "en")
#set par(leading: 0.9em, spacing: 0.8em)
#show heading.where(level: 1): set text(font: "Libertinus Serif", size: 34pt, weight: "regular", fill: charcoal)
#show heading.where(level: 2): set text(font: "Libertinus Serif", size: 19pt, weight: "regular", fill: charcoal)
#show heading.where(level: 3): set text(font: "Libertinus Serif", size: 13pt, weight: "regular", fill: charcoal)
#let label(txt) = text(size: 7pt, weight: "bold", tracking: 1.2pt, fill: canopy)[txt]
#let rule = line(length: 100%, stroke: 0.6pt + charcoal.transparentize(70%))
#let arrow = text(fill: canopy, size: 12pt)[→]

#align(center)[
  #image("ajiya-logo.jpg", width: 35mm)
  #v(20mm)
  #text(size: 8pt, weight: "bold", tracking: 2pt, fill: canopy)[PROPERTY, PLACE, POSSIBILITY]
  #v(8mm)
  #text(font: "Libertinus Serif", size: 49pt)[Creating opportunities.]
  #linebreak()
  #text(font: "Libertinus Serif", size: 49pt, style: "italic", fill: canopy)[Building lasting value.]
  #v(13mm)
  #text(size: 12pt, fill: charcoal.transparentize(28%))[AJIYA Urban Rise Ltd]
  #v(24mm)
  #rect(width: 100%, height: 42mm, fill: charcoal, inset: 8mm)[
    #text(font: "Libertinus Serif", size: 18pt, fill: limestone)[Land becomes more meaningful when it creates room for what comes next.]
  ]
  #v(15mm)
  #label[ABUJA · NIGERIA]
]

#pagebreak()

#label[01 / THE AJIYA VIEW]
#v(4mm)
= A considered future for property.
#v(3mm)
#text(size: 12pt, fill: canopy)[Creating opportunities. Building lasting value. Leaving a legacy.]
#v(8mm)
#rule
#v(8mm)
AJIYA Urban Rise is a real-estate development, investment, property sales, property management, and construction company based in Abuja, Nigeria. We are focused on the ideas and details that make a place useful, secure, and ready for the people who will shape its next chapter.

Our mission is to become a leading real-estate company in Nigeria by providing affordable homes and valuable land investments. Our work is guided by a simple belief: a property opportunity can be more than a transaction. It can be a beginning.

#v(10mm)
#grid(columns: (1fr, 1fr), gutter: 8mm,
  [
    #label[OUR PHILOSOPHY]
    #v(3mm)
    #text(font: "Libertinus Serif", size: 21pt)[Creating opportunities.]
    #v(2mm)
    #text(font: "Libertinus Serif", size: 21pt)[Building lasting value.]
    #v(2mm)
    #text(font: "Libertinus Serif", size: 21pt)[Leaving a legacy.]
  ],
  [
    #label[THE JOURNEY]
    #v(3mm)
    #text(font: "Libertinus Serif", size: 17pt)[Land]
    #h(4mm) #arrow #h(4mm)
    #text(font: "Libertinus Serif", size: 17pt)[Development]
    #h(4mm) #arrow #h(4mm)
    #text(font: "Libertinus Serif", size: 17pt)[Community]
    #h(4mm) #arrow #h(4mm)
    #text(font: "Libertinus Serif", size: 17pt)[Legacy]
  ]
)
#v(14mm)
#rect(width: 100%, fill: stone, inset: 8mm)[
  #label[OUR POINT OF VIEW]
  #v(4mm)
  #text(font: "Libertinus Serif", size: 25pt)[The future is not a skyline. It is a place people can belong to.]
]

#pagebreak()

#label[02 / WHAT WE DO]
#v(4mm)
= One connected view of real estate.
#v(3mm)
From the first question to the finished place, our capabilities are connected by clear thinking and a long-term view of value.
#v(8mm)
#rule
#v(8mm)
#label[01] #v(2mm)
#text(font: "Libertinus Serif", size: 20pt)[Real Estate Development]
#v(2mm)
#text(fill: charcoal.transparentize(28%))[From land opportunity to considered urban place, we plan and shape developments built for lasting value.]
#v(6mm)
#label[02] #v(2mm)
#text(font: "Libertinus Serif", size: 20pt)[Property Sales]
#v(2mm)
#text(fill: charcoal.transparentize(28%))[Clear guidance for buyers exploring land, homes, and residential opportunities across Abuja’s evolving landscape.]
#v(6mm)
#label[03] #v(2mm)
#text(font: "Libertinus Serif", size: 20pt)[Real Estate Investment]
#v(2mm)
#text(fill: charcoal.transparentize(28%))[A long-term view of property and land investment, grounded in location, potential, and the work behind value.]
#v(6mm)
#label[04] #v(2mm)
#text(font: "Libertinus Serif", size: 20pt)[Property Management]
#v(2mm)
#text(fill: charcoal.transparentize(28%))[Practical support that helps property assets remain cared for, useful, and positioned for the next chapter.]
#v(6mm)
#label[05] #v(2mm)
#text(font: "Libertinus Serif", size: 20pt)[Construction]
#v(2mm)
#text(fill: charcoal.transparentize(28%))[Development expertise translated into disciplined delivery, from the first line on a plan to the built environment.]
#v(12mm)
#rect(width: 100%, fill: canopy, inset: 9mm)[
  #label[THE AJIYA APPROACH]
  #v(5mm)
  #text(font: "Libertinus Serif", size: 27pt, fill: limestone)[Discover → Evaluate → Invest → Build long-term value]
]

#pagebreak()

#label[03 / FEATURED DEVELOPMENTS]
#v(4mm)
= Places with a point of view.
#v(3mm)
AJIYA’s featured developments are shaped by a belief in opportunity, community, and the future of Abuja.
#v(8mm)
#rule
#v(9mm)
#rect(width: 100%, fill: charcoal, inset: 9mm)[
  #label[01 / KUBWA, ABUJA]
  #v(6mm)
  #text(font: "Libertinus Serif", size: 31pt, fill: limestone)[AJIYA Signature Estate]
  #v(4mm)
  #text(font: "Libertinus Serif", size: 15pt, style: "italic", fill: bronze)[Where vision meets value.]
  #v(7mm)
  #text(fill: limestone.transparentize(23%))[A residential development story shaped around belonging, access, and the quiet confidence of a place built to last.]
  #v(8mm)
  #label[RESIDENTIAL DEVELOPMENT]
]
#v(8mm)
#rect(width: 100%, fill: stone, inset: 9mm)[
  #label[02 / ABUJA GROWTH CORRIDOR]
  #v(6mm)
  #text(font: "Libertinus Serif", size: 31pt)[Urban Rise Estate]
  #v(4mm)
  #text(font: "Libertinus Serif", size: 15pt, style: "italic", fill: canopy)[A wider view of growth.]
  #v(7mm)
  #text(fill: charcoal.transparentize(25%))[An emerging urban vision that connects land, infrastructure, and community into a stronger future for the city.]
  #v(8mm)
  #label[MASTERPLANNED COMMUNITY]
]
#v(15mm)
#label[CONTINUE THE CONVERSATION]
#v(4mm)
#text(font: "Libertinus Serif", size: 22pt)[Tell us what you are exploring.]
#v(4mm)
#text(fill: charcoal.transparentize(25%))[Suite 1021, Third Floor · Los Angeles Mall · Ahmadu Bello Way · Mabushi, Abuja, Nigeria]
#v(5mm)
#text(weight: "bold", fill: canopy)[+234 903 373 4656  ·  \@ajiyaurbanrise]
