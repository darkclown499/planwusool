import{j as r}from"./ui-DBDxmXNs.js";import{c as H}from"./xss-protection-BU0xw_Dg.js";import{a as D,H as L}from"./app-D7yVRvll.js";import P from"./Header-QICJ7CnD.js";import T from"./Footer-CW0yfQkU.js";import{u as E}from"./use-favicon-C8wKrY6a.js";import{g as K}from"./image-helper-BvlLdp70.js";import"./utils-DBYZG17H.js";import"./react-country-flag.esm-DiKTCyA0.js";import"./language-B4PvsWWD.js";import"./globe-CX5Csgbl.js";import"./chevron-down-B8lzXczq.js";import"./check-DZ_pS5u1.js";import"./menu-C3-AxuUX.js";import"./arrow-left-ClwbzXnc.js";import"./mail-B2x24oKe.js";import"./phone-Dnz255DZ.js";import"./map-pin-DRkJsqv4.js";function oo(){var b,u,d,x,y,v,f,h,j,k,_,w,C;const F=`
    /* Fix form inputs */
    .custom-page-content input:focus, 
    .custom-page-content textarea:focus {
      --tw-ring-color: var(--primary-color) !important;
      border-color: var(--primary-color) !important;
    }
    
    /* Fix color issues */
    .custom-page-content .bg-blue-50 { background-color: rgba(var(--primary-color-rgb), 0.1) !important; }
    .custom-page-content .bg-purple-50 { background-color: rgba(var(--secondary-color-rgb), 0.1) !important; }
    .custom-page-content .bg-green-50 { background-color: rgba(var(--accent-color-rgb), 0.1) !important; }
    .custom-page-content .bg-red-50 { background-color: rgba(var(--accent-color-rgb), 0.1) !important; }
    
    .custom-page-content .text-blue-600 { color: var(--primary-color) !important; }
    .custom-page-content .text-purple-600 { color: var(--secondary-color) !important; }
    .custom-page-content .text-green-600 { color: var(--accent-color) !important; }
    .custom-page-content .text-red-600 { color: var(--accent-color) !important; }
    
    .custom-page-content .border-blue-500 { border-color: var(--primary-color) !important; }
    .custom-page-content .border-purple-500 { border-color: var(--secondary-color) !important; }
    .custom-page-content .border-green-500 { border-color: var(--accent-color) !important; }
    .custom-page-content .border-red-500 { border-color: var(--accent-color) !important; }
    
    .custom-page-content .bg-blue-600 { background-color: var(--primary-color) !important; }
    .custom-page-content .bg-purple-600 { background-color: var(--secondary-color) !important; }
    .custom-page-content .bg-green-600 { background-color: var(--accent-color) !important; }
    .custom-page-content .bg-red-500 { background-color: var(--accent-color) !important; }
    
    /* Fix border colors */
    .custom-page-content .border-blue-200 { border-color: rgba(var(--primary-color-rgb), 0.2) !important; }
    .custom-page-content .border-green-200 { border-color: rgba(var(--accent-color-rgb), 0.2) !important; }
    
    /* Fix hover states */
    .custom-page-content .hover:bg-blue-700:hover { background-color: var(--primary-color) !important; opacity: 0.9; }
    
    /* Fix form button */
    .custom-page-content .bg-blue-600 { background-color: var(--primary-color) !important; }
  `,l=D(),{page:c,customPages:I=[],settings:o,superadminLogoDark:N,superadminLogoLight:p}=l.props,{auth:m,superadminSettings:t}=l.props;t!=null&&t.metaTitle||t!=null&&t.titleText,t!=null&&t.metaDescription;const s=(t==null?void 0:t.metaKeywords)||"",a=t!=null&&t.metaImage?K(t.metaImage):"",n=((u=(b=o==null?void 0:o.config_sections)==null?void 0:b.theme)==null?void 0:u.primary_color)||"#3b82f6",i=((x=(d=o==null?void 0:o.config_sections)==null?void 0:d.theme)==null?void 0:x.secondary_color)||"#8b5cf6",g=((v=(y=o==null?void 0:o.config_sections)==null?void 0:y.theme)==null?void 0:v.accent_color)||"#10b77f";return E(),r.jsxs(r.Fragment,{children:[r.jsxs(L,{children:[r.jsx("title",{children:c.meta_title||c.title}),c.meta_description&&r.jsx("meta",{name:"description",content:c.meta_description}),s&&r.jsx("meta",{name:"keywords",content:s}),a&&r.jsx("meta",{property:"og:image",content:a}),a&&r.jsx("meta",{name:"twitter:image",content:a}),r.jsx("style",{children:F})]}),r.jsxs("div",{className:"min-h-screen bg-white",style:{"--primary-color":n,"--secondary-color":i,"--accent-color":g,"--primary-color-rgb":((f=n.replace("#","").match(/.{2}/g))==null?void 0:f.map(e=>parseInt(e,16)).join(", "))||"59, 130, 246","--secondary-color-rgb":((h=i.replace("#","").match(/.{2}/g))==null?void 0:h.map(e=>parseInt(e,16)).join(", "))||"139, 92, 246","--accent-color-rgb":((j=g.replace("#","").match(/.{2}/g))==null?void 0:j.map(e=>parseInt(e,16)).join(", "))||"16, 185, 129"},children:[r.jsx(P,{settings:o,customPages:I,sectionData:((_=(k=o==null?void 0:o.config_sections)==null?void 0:k.sections)==null?void 0:_.find(e=>e.key==="header"))||{},brandColor:n,superadminLogoDark:N,superadminLogoLight:p,user:m==null?void 0:m.user}),r.jsx("main",{className:"pt-16",children:r.jsx("div",{className:"container mx-auto px-4 py-12",children:r.jsxs("div",{className:"max-w-4xl mx-auto",children:[r.jsx("h1",{className:"text-4xl font-bold mb-8 text-gray-900",children:c.title}),r.jsx("div",{className:"custom-page-content prose prose-lg max-w-none",dangerouslySetInnerHTML:H(c.content)})]})})}),r.jsx(T,{settings:o,sectionData:((C=(w=o==null?void 0:o.config_sections)==null?void 0:w.sections)==null?void 0:C.find(e=>e.key==="footer"))||{},brandColor:n,superadminLogoLight:p})]})]})}export{oo as default};
