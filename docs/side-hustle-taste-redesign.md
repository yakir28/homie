# Side-hustle Taste redesign

Design read: consumer landing page for US side-hustle beginners, with a confident product-led visual language. DESIGN_VARIANCE 7 / MOTION_INTENSITY 4 / VISUAL_DENSITY 3. Native CSS modules extend the existing brand rather than introducing a separate design system.

Audit: existing charcoal #20291f, lime #d4f588, Urbanist display, Inter body, transparent Homie wordmark. Route /side-hustle; anchors main/how/examples/faq/start; signup query and homie:conversion events preserved. English metadata retained. Existing tiny labels, repeated split layouts, equal feature columns, and inverted outreach section retired. Real cottage photo and template videos remain the proof. Legal text and first-video limitations retained. Existing motion remains action-driven.

Composition: compact navigation, broad headline and offer above an asymmetric photo/video stage; understated service explanation; horizontal workflow rows; staggered video gallery; spacious outreach draft; unified offer band; FAQ disclosure and simple close. Urbanist throughout, consistent 16px media corners and 8px controls. Automatic theme tokens plus an accessible theme toggle allow both modes to be reviewed. Media captions stay outside imagery.

Validation: production build passed; scoped ESLint has zero errors and three existing native-image warnings. Browser checks passed at 1440px and 390px; inspected light and dark themes, video playback, FAQ click/Enter/Space, copy success, mobile sticky, and horizontal overflow. Real portrait video uses contain to avoid cropping. Reduced-motion rules retained. No Lighthouse score is claimed: the available browser runtime does not expose Lighthouse and no standalone browser audit was run. Core Web Vitals require a production measurement.
