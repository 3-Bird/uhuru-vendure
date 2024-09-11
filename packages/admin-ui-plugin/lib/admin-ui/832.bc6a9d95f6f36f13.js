"use strict";(self.webpackChunkvendure_admin=self.webpackChunkvendure_admin||[]).push([[832],{3832:(k,C,r)=>{r.r(C),r.d(C,{LoginComponent:()=>c,LoginGuard:()=>s,LoginModule:()=>d,loginRoutes:()=>M});var g=r(1582),n=r(6504),h=r(1894),w=r(8900),p=r(2232),u=r(4739),l=r(1259),f=r(3037),P=r(4538),O=r(1149);const _=i=>({brand:i});function b(i,o){if(1&i&&(n.j41(0,"p",20),n.EFF(1," Photo by "),n.j41(2,"a",21),n.EFF(3),n.k0s(),n.EFF(4," on "),n.j41(5,"a",21),n.EFF(6,"Unsplash"),n.k0s()()),2&i){const e=n.XpG();n.R7$(2),n.Y8G("href",e.imageCreatorUrl,n.B4B),n.R7$(),n.JRh(e.imageCreator),n.R7$(2),n.Y8G("href",e.imageUnsplashUrl,n.B4B)}}function x(i,o){if(1&i&&(n.j41(0,"p",22),n.EFF(1),n.k0s()),2&i){const e=n.XpG();n.R7$(),n.JRh(e.imageLocation)}}function v(i,o){if(1&i&&n.nrm(0,"img",23),2&i){const e=n.XpG();n.Y8G("src",e.imageUrl,n.B4B)("alt",e.imageUrl)}}function y(i,o){1&i&&n.nrm(0,"img",24)}class c{constructor(o,e,t,m){this.authService=o,this.router=e,this.httpClient=t,this.localizationService=m,this.username="",this.password="",this.rememberMe=!1,this.version=g.cBU,this.brand=(0,g.WEc)().brand,this.hideVendureBranding=(0,g.WEc)().hideVendureBranding,this.customImageUrl=(0,g.WEc)().loginImageUrl,this.imageUrl="",this.imageUnsplashUrl="",this.imageLocation="",this.imageCreator="",this.imageCreatorUrl="",this.customImageUrl?this.imageUrl=this.customImageUrl:this.loadImage()}ngOnInit(){this.direction$=this.localizationService.direction$}logIn(){this.errorMessage=void 0,this.authService.logIn(this.username,this.password,this.rememberMe).subscribe(o=>{switch(o.__typename){case"CurrentUser":const e=this.getRedirectRoute();this.router.navigateByUrl(e||"/");break;case"InvalidCredentialsError":case"NativeAuthStrategyError":this.errorMessage=o.message}})}loadImage(){this.httpClient.get("https://login-image.vendure.io").toPromise().then(o=>{this.updateImage(o)})}updateImage(o){const e=o.user,t=o.location;this.imageUrl=o.urls.regular+"?utm_source=Vendure+Login+Image&utm_medium=referral",this.imageCreator=e.name,this.imageLocation=t.name,this.imageCreatorUrl=e.links.html+"?utm_source=Vendure+Login+Image&utm_medium=referral",this.imageUnsplashUrl=o.links.html}getRedirectRoute(){let o;const e=new RegExp(`${g.KdK}=(.*)`);try{const t=window.location.search.match(e);t&&1<t.length&&(o=atob(decodeURIComponent(t[1])))}catch{}return o}static#n=this.\u0275fac=function(e){return new(e||c)(n.rXU(g.uRZ),n.rXU(h.Ix),n.rXU(w.Qq),n.rXU(g.PiF))};static#e=this.\u0275cmp=n.VBU({type:c,selectors:[["vdr-login"]],decls:36,vars:37,consts:[[1,"login-wrapper",3,"dir"],[1,"login-wrapper-inner"],[1,"login-wrapper-image"],[1,"login-wrapper-image-content"],[1,"login-wrapper-image-title"],[1,"login-wrapper-image-copyright"],["class","creator",4,"ngIf"],["class","location",4,"ngIf"],[3,"src","alt",4,"ngIf"],[1,"login-wrapper-form"],[1,"login-title"],[1,"login-form"],[1,"login-group"],["type","text","name","username","id","login_username",1,"username",3,"ngModelChange","ngModel","placeholder"],["name","password","type","password","id","login_password",1,"password",3,"ngModelChange","ngModel","placeholder"],[1,"login-error",3,"clrAlertType","clrAlertClosable"],[1,"alert-text"],["type","checkbox","clrCheckbox","","id","rememberme","name","rememberme",3,"ngModelChange","ngModel"],["type","submit",1,"button","primary","login-button",3,"click","disabled"],["class","login-wrapper-logo","src","assets/logo-login.webp",4,"ngIf"],[1,"creator"],["target","_blank",3,"href"],[1,"location"],[3,"src","alt"],["src","assets/logo-login.webp",1,"login-wrapper-logo"]],template:function(e,t){1&e&&(n.j41(0,"div",0),n.nI1(1,"async"),n.j41(2,"div",1)(3,"div",2)(4,"div",3)(5,"div",4),n.EFF(6),n.nI1(7,"translate"),n.k0s(),n.j41(8,"div",5),n.DNE(9,b,7,3,"p",6)(10,x,2,1,"p",7),n.k0s()(),n.DNE(11,v,1,2,"img",8),n.k0s(),n.j41(12,"div",9)(13,"p",10),n.EFF(14),n.nI1(15,"translate"),n.k0s(),n.j41(16,"form",11)(17,"div",12)(18,"input",13),n.nI1(19,"translate"),n.mxI("ngModelChange",function(a){return n.DH7(t.username,a)||(t.username=a),a}),n.k0s(),n.j41(20,"input",14),n.nI1(21,"translate"),n.mxI("ngModelChange",function(a){return n.DH7(t.password,a)||(t.password=a),a}),n.k0s(),n.j41(22,"clr-alert",15)(23,"clr-alert-item")(24,"span",16),n.EFF(25),n.k0s()()(),n.j41(26,"clr-checkbox-wrapper")(27,"input",17),n.mxI("ngModelChange",function(a){return n.DH7(t.rememberMe,a)||(t.rememberMe=a),a}),n.k0s(),n.j41(28,"label"),n.EFF(29),n.nI1(30,"translate"),n.k0s()(),n.j41(31,"div")(32,"button",18),n.bIt("click",function(){return t.logIn()}),n.EFF(33),n.nI1(34,"translate"),n.k0s()()()()(),n.DNE(35,y,1,0,"img",19),n.k0s()()),2&e&&(n.Y8G("dir",n.bMT(1,20,t.direction$)),n.R7$(6),n.SpI(" ",n.bMT(7,22,"common.login-image-title")," "),n.R7$(3),n.Y8G("ngIf",t.imageCreator),n.R7$(),n.Y8G("ngIf",t.imageLocation),n.R7$(),n.Y8G("ngIf",t.imageUrl),n.R7$(3),n.SpI(" ",n.i5U(15,24,"common.login-title",n.eq3(35,_,t.hideVendureBranding?t.brand:"Vendure"))," "),n.R7$(4),n.R50("ngModel",t.username),n.Y8G("placeholder",n.bMT(19,27,"common.username")),n.R7$(2),n.R50("ngModel",t.password),n.Y8G("placeholder",n.bMT(21,29,"common.password")),n.R7$(2),n.AVh("visible",t.errorMessage),n.Y8G("clrAlertType","danger")("clrAlertClosable",!1),n.R7$(3),n.SpI(" ",t.errorMessage," "),n.R7$(2),n.R50("ngModel",t.rememberMe),n.R7$(2),n.JRh(n.bMT(30,31,"common.remember-me")),n.R7$(3),n.Y8G("disabled",!t.username||!t.password),n.R7$(),n.SpI(" ",n.bMT(34,33,"common.login")," "),n.R7$(2),n.Y8G("ngIf",!t.hideVendureBranding))},dependencies:[p.k8k,p.Bw1,p.tQl,p.aZZ,p.Jej,p.eAx,u.bT,l.qT,l.me,l.Zm,l.BC,l.cb,l.vS,l.cV,f.ig,P.V,u.Jj,O.D9],styles:[".login-wrapper[_ngcontent-%COMP%]{background:var(--color-weight-100);background-image:none;height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}.login-wrapper[_ngcontent-%COMP%]   .login-wrapper-inner[_ngcontent-%COMP%]{background:var(--login-wrapper-inner-bg);width:1120px;height:590px;display:flex;justify-content:flex-start;align-items:stretch;position:relative;border-radius:var(--border-radius);border:1px solid var(--color-weight-150);overflow:hidden}@media (max-width: 992px){.login-wrapper[_ngcontent-%COMP%]   .login-wrapper-inner[_ngcontent-%COMP%]{flex-direction:column;height:auto;width:100%}}.login-wrapper[_ngcontent-%COMP%]   .login-wrapper-inner[_ngcontent-%COMP%]   .login-wrapper-image[_ngcontent-%COMP%]{height:100%;flex-grow:1;position:relative}@media (max-width: 992px){.login-wrapper[_ngcontent-%COMP%]   .login-wrapper-inner[_ngcontent-%COMP%]   .login-wrapper-image[_ngcontent-%COMP%]{height:300px}}.login-wrapper[_ngcontent-%COMP%]   .login-wrapper-inner[_ngcontent-%COMP%]   .login-wrapper-image[_ngcontent-%COMP%]   img[_ngcontent-%COMP%]{display:block;width:100%;height:100%;object-fit:cover;object-position:center;position:relative;z-index:1}.login-wrapper[_ngcontent-%COMP%]   .login-wrapper-inner[_ngcontent-%COMP%]   .login-wrapper-image[_ngcontent-%COMP%]   .login-wrapper-image-content[_ngcontent-%COMP%]{width:100%;height:100%;position:absolute;left:0;bottom:0;z-index:10;background:#020024;background:linear-gradient(180deg,#02002400,#000000bf);display:flex;flex-direction:column;align-items:flex-start;justify-content:flex-end;padding:30px}.login-wrapper[_ngcontent-%COMP%]   .login-wrapper-inner[_ngcontent-%COMP%]   .login-wrapper-image[_ngcontent-%COMP%]   .login-wrapper-image-content[_ngcontent-%COMP%]   .login-wrapper-image-title[_ngcontent-%COMP%]{font-size:1.6rem;font-weight:700;color:#fff;margin-bottom:20px}@media (max-width: 992px){.login-wrapper[_ngcontent-%COMP%]   .login-wrapper-inner[_ngcontent-%COMP%]   .login-wrapper-image[_ngcontent-%COMP%]   .login-wrapper-image-content[_ngcontent-%COMP%]   .login-wrapper-image-title[_ngcontent-%COMP%]{font-size:1.2rem}}.login-wrapper[_ngcontent-%COMP%]   .login-wrapper-inner[_ngcontent-%COMP%]   .login-wrapper-image[_ngcontent-%COMP%]   .login-wrapper-image-content[_ngcontent-%COMP%]   .login-wrapper-image-copyright[_ngcontent-%COMP%]{opacity:.8}.login-wrapper[_ngcontent-%COMP%]   .login-wrapper-inner[_ngcontent-%COMP%]   .login-wrapper-image[_ngcontent-%COMP%]   .login-wrapper-image-content[_ngcontent-%COMP%]   .login-wrapper-image-copyright[_ngcontent-%COMP%]   p[_ngcontent-%COMP%]{font-size:.6rem;color:#fff;margin:0!important}.login-wrapper[_ngcontent-%COMP%]   .login-wrapper-inner[_ngcontent-%COMP%]   .login-wrapper-image[_ngcontent-%COMP%]   .login-wrapper-image-content[_ngcontent-%COMP%]   .login-wrapper-image-copyright[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]{color:#fff;text-decoration:underline}.login-wrapper[_ngcontent-%COMP%]   .login-wrapper-inner[_ngcontent-%COMP%]   .login-wrapper-form[_ngcontent-%COMP%]{height:100%;width:400px;padding:40px;display:flex;flex-direction:column;align-items:stretch;justify-content:center;box-shadow:0 20px 25px #0000001a;overflow:hidden;flex-shrink:0}@media (max-width: 992px){.login-wrapper[_ngcontent-%COMP%]   .login-wrapper-inner[_ngcontent-%COMP%]   .login-wrapper-form[_ngcontent-%COMP%]{height:auto;width:100%;padding:20px}}.login-wrapper[_ngcontent-%COMP%]   .login-wrapper-inner[_ngcontent-%COMP%]   .login-wrapper-form[_ngcontent-%COMP%]   .login-title[_ngcontent-%COMP%]{font-weight:700;font-size:1.2rem;margin-bottom:20px;color:var(--color-weight-600)}.login-wrapper[_ngcontent-%COMP%]   .login-wrapper-inner[_ngcontent-%COMP%]   .login-wrapper-form[_ngcontent-%COMP%]   .login-group[_ngcontent-%COMP%]   input.username[_ngcontent-%COMP%], .login-wrapper[_ngcontent-%COMP%]   .login-wrapper-inner[_ngcontent-%COMP%]   .login-wrapper-form[_ngcontent-%COMP%]   .login-group[_ngcontent-%COMP%]   input.password[_ngcontent-%COMP%]{display:block;width:100%;margin-bottom:15px;padding:12px 16px!important;background:#fff;font-size:14px;line-height:22px;color:#52667a;outline:none;-webkit-appearance:none}.login-wrapper[_ngcontent-%COMP%]   .login-wrapper-inner[_ngcontent-%COMP%]   .login-wrapper-form[_ngcontent-%COMP%]   .login-group[_ngcontent-%COMP%]   .btn[_ngcontent-%COMP%]{width:100%!important;margin-top:20px!important}.login-wrapper[_ngcontent-%COMP%]   .login-wrapper-inner[_ngcontent-%COMP%]   .login-wrapper-logo[_ngcontent-%COMP%]{width:60px;height:auto;position:absolute;right:20px;top:20px}.login-button[_ngcontent-%COMP%]{width:100%;margin-top:var(--space-unit);justify-content:center}.version[_ngcontent-%COMP%]{flex:1;flex-grow:1;display:flex;align-items:flex-end;justify-content:center;color:var(--color-grey-300)}.version[_ngcontent-%COMP%]   span[_ngcontent-%COMP%] + span[_ngcontent-%COMP%]{margin-inline-start:5px}.login-error[_ngcontent-%COMP%]{max-height:0;overflow:hidden;display:block}.login-error.visible[_ngcontent-%COMP%]{max-height:46px;transition:max-height .2s;animation:_ngcontent-%COMP%_shake .82s cubic-bezier(.36,.07,.19,.97) both;animation-delay:.2s;transform:translateZ(0);backface-visibility:hidden;perspective:1000px}@keyframes _ngcontent-%COMP%_shake{10%,90%{transform:translate3d(-1px,0,0)}20%,80%{transform:translate3d(2px,0,0)}30%,50%,70%{transform:translate3d(-4px,0,0)}40%,60%{transform:translate3d(4px,0,0)}}.login-wrapper[dir=rtl][_ngcontent-%COMP%]   .login-wrapper-inner[_ngcontent-%COMP%]   .login-wrapper-logo[_ngcontent-%COMP%]{right:auto;left:20px}.login-wrapper[dir=rtl][_ngcontent-%COMP%]   .login-wrapper-inner[_ngcontent-%COMP%]   .login-wrapper-image[_ngcontent-%COMP%]   .login-wrapper-image-content[_ngcontent-%COMP%]{left:auto;right:0}"]})}var I=r(1044);class s{constructor(o,e){this.router=o,this.authService=e}canActivate(o){return this.authService.checkAuthenticatedStatus().pipe((0,I.T)(e=>(e&&this.router.navigate(["/"]),!e)))}static#n=this.\u0275fac=function(e){return new(e||s)(n.KVO(h.Ix),n.KVO(g.uRZ))};static#e=this.\u0275prov=n.jDH({token:s,factory:s.\u0275fac,providedIn:"root"})}const M=[{path:"",component:c,pathMatch:"full",canActivate:[s]}];class d{static#n=this.\u0275fac=function(e){return new(e||d)};static#e=this.\u0275mod=n.$C({type:d});static#t=this.\u0275inj=n.G2t({imports:[g.GgS,h.iI.forChild(M)]})}}}]);