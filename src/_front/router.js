import { createRouter, createWebHistory } from 'vue-router';

import wwPage from './views/wwPage.vue';

import { initializeData, initializePlugins, onPageUnload } from '@/_common/helpers/data';

let router;
const routes = [];

function scrollBehavior(to) {
    if (to.hash) {
        return {
            el: to.hash,
            behavior: 'smooth',
        };
    } else {
        return { top: 0 };
    }
}

 
/* wwFront:start */
import pluginsSettings from '../../plugins-settings.json';

// eslint-disable-next-line no-undef
window.wwg_designInfo = {"id":"9311c005-2b3f-42e5-acc9-c54a2604bcbe","homePageId":"0a1f3645-42f4-4253-bcfb-cef57ee18c66","authPluginId":"1fa0dd68-5069-436c-9a7d-3b54c340f1fa","baseTag":null,"defaultTheme":"light","langs":[{"lang":"en","default":true,"isDefaultPath":false},{"lang":"es","default":false,"isDefaultPath":false}],"background":{},"workflows":[{"id":"67e8274c-cb64-493f-9f28-63de66dcbc57","name":"changeLanguage","actions":{"1d8509c3-2865-4c79-9582-f4cd8078654d":{"id":"1d8509c3-2865-4c79-9582-f4cd8078654d","next":"e3718f98-a5e9-4a19-8d58-6a5b7535c049","type":"fetch-collection","collectionId":"67fb8914-a3b3-4216-bb88-913f915b3e5b"},"e3718f98-a5e9-4a19-8d58-6a5b7535c049":{"id":"e3718f98-a5e9-4a19-8d58-6a5b7535c049","lang":{"code":"collections['67fb8914-a3b3-4216-bb88-913f915b3e5b']?.['data']?.[0]?.['language']","__wwtype":"f"},"type":"change-lang"}},"trigger":"before-collection-fetch-app","firstAction":"1d8509c3-2865-4c79-9582-f4cd8078654d","triggerConditions":null},{"id":"ee0781c2-a17b-44c4-a066-d89ac42a8620","actions":{"1f836153-f28d-4d13-9e3d-b17d954e655b":{"id":"1f836153-f28d-4d13-9e3d-b17d954e655b","type":"change-page","pageId":"ec4a7639-4aa7-4495-b834-3db1162b96a8","navigateMode":"internal"},"92cf50cb-fb01-4ea8-b507-1f9c3722376e":{"id":"92cf50cb-fb01-4ea8-b507-1f9c3722376e","next":"1f836153-f28d-4d13-9e3d-b17d954e655b","type":"filter","value":{"code":"collections['67fb8914-a3b3-4216-bb88-913f915b3e5b']?.['data']?.[0]?.['is_active']==false","__wwtype":"f"}}},"trigger":"onload","firstAction":"92cf50cb-fb01-4ea8-b507-1f9c3722376e","triggerConditions":null}],"pages":[{"id":"c9cc3696-ba22-4995-9ac0-227d1d79448c","linkId":"c9cc3696-ba22-4995-9ac0-227d1d79448c","name":"document-view","folder":null,"paths":{"en":"document-view","default":"document-view"},"langs":["en","es"],"cmsDataSetPath":null,"sections":[{"uid":"beb5d079-6e72-4176-8334-804959245e1e","sectionTitle":"Section","linkId":"61620727-a59d-45c1-9f51-7261b146e43c"}],"pageUserGroups":[{}],"title":{},"meta":{"desc":{},"keywords":{},"socialDesc":{},"socialTitle":{},"structuredData":{}},"metaImage":""},{"id":"0a1f3645-42f4-4253-bcfb-cef57ee18c66","linkId":"0a1f3645-42f4-4253-bcfb-cef57ee18c66","name":"events","folder":null,"paths":{"en":"events","default":"events"},"langs":["en","es"],"cmsDataSetPath":null,"sections":[{"uid":"1b98643a-ff70-498f-a8ed-a0d587959022","sectionTitle":"Sidemenu","linkId":"6d0ebf51-3cd5-4724-8711-51c172373037"},{"uid":"2305e9fc-ca20-4ea0-8c82-04c2f9ccb46b","sectionTitle":"Container","linkId":"990fc71a-17ff-473c-a644-7f77487bc15b"}],"pageUserGroups":[{}],"title":{},"meta":{"desc":{},"keywords":{},"socialDesc":{},"socialTitle":{},"structuredData":{}},"metaImage":""},{"id":"5c9661af-8b18-40f0-9ffc-5532e0857b0e","linkId":"5c9661af-8b18-40f0-9ffc-5532e0857b0e","name":"documents","folder":null,"paths":{"en":"documents","default":"documents"},"langs":["en","es"],"cmsDataSetPath":null,"sections":[{"uid":"1b98643a-ff70-498f-a8ed-a0d587959022","sectionTitle":"Sidemenu","linkId":"6d0ebf51-3cd5-4724-8711-51c172373037"},{"uid":"e3b24791-9c92-4bd3-aea5-b10f112cde90","sectionTitle":"Container","linkId":"da4b8beb-95f6-486d-adf3-5141d3a33b54"}],"pageUserGroups":[{}],"title":{},"meta":{"desc":{},"keywords":{},"socialDesc":{},"socialTitle":{},"structuredData":{}},"metaImage":""},{"id":"87c746ed-0f0e-463e-8001-9dbb705b247c","linkId":"87c746ed-0f0e-463e-8001-9dbb705b247c","name":"finances","folder":null,"paths":{"en":"finances","default":"finances"},"langs":["en","es"],"cmsDataSetPath":null,"sections":[{"uid":"1b98643a-ff70-498f-a8ed-a0d587959022","sectionTitle":"Sidemenu","linkId":"6d0ebf51-3cd5-4724-8711-51c172373037"},{"uid":"bbb35a1c-7a85-4526-9249-d8dc30aa1761","sectionTitle":"Container","linkId":"ee138441-78d2-4fe3-a47f-f39e959de74e"}],"pageUserGroups":[{}],"title":{},"meta":{"desc":{},"keywords":{},"socialDesc":{},"socialTitle":{},"structuredData":{}},"metaImage":""},{"id":"cacaa4e4-0ad4-4117-a309-45f3977cfc1b","linkId":"cacaa4e4-0ad4-4117-a309-45f3977cfc1b","name":"deals","folder":null,"paths":{"en":"deals","default":"deals"},"langs":["en","es"],"cmsDataSetPath":null,"sections":[{"uid":"1b98643a-ff70-498f-a8ed-a0d587959022","sectionTitle":"Sidemenu","linkId":"6d0ebf51-3cd5-4724-8711-51c172373037"},{"uid":"acb2a0e2-e9e2-4a85-b96d-e45ce92843bd","sectionTitle":"Container","linkId":"143dabc7-e497-415a-a29e-230e857aadee"}],"pageUserGroups":[{}],"title":{},"meta":{"desc":{},"keywords":{},"socialDesc":{},"socialTitle":{},"structuredData":{}},"metaImage":""},{"id":"5ea70a2d-abef-4a4a-83ec-7bba38bc0a76","linkId":"5ea70a2d-abef-4a4a-83ec-7bba38bc0a76","name":"supplier-verify-identity","folder":null,"paths":{"en":"supplier-signup","default":"supplier-signup"},"langs":["en","es"],"cmsDataSetPath":null,"sections":[{"uid":"f78ecf48-0292-4549-8b3b-7b4fec22824e","sectionTitle":"Login","linkId":"a9f1649d-20d7-4998-bd9a-b63b49104737"}],"pageUserGroups":[],"title":{},"meta":{"desc":{},"keywords":{},"socialDesc":{},"socialTitle":{},"structuredData":{}},"metaImage":""},{"id":"2d2c8ae0-56c3-4317-8a91-941e8928f410","linkId":"2d2c8ae0-56c3-4317-8a91-941e8928f410","name":"contacts new","folder":null,"paths":{"en":"contacts","default":"contacts"},"langs":["en","es"],"cmsDataSetPath":null,"sections":[{"uid":"1b98643a-ff70-498f-a8ed-a0d587959022","sectionTitle":"Sidemenu","linkId":"6d0ebf51-3cd5-4724-8711-51c172373037"},{"uid":"0ee113ee-18e3-41ce-bf37-68007514f816","sectionTitle":"Container","linkId":"58c662e0-7c91-411d-b864-812d3d87e01e"}],"pageUserGroups":[{}],"title":{},"meta":{"desc":{},"keywords":{},"socialDesc":{},"socialTitle":{},"structuredData":{}},"metaImage":""},{"id":"4838ea0a-0f96-4056-b303-68fad993c61b","linkId":"4838ea0a-0f96-4056-b303-68fad993c61b","name":"settings","folder":null,"paths":{"en":"settings","default":"settings"},"langs":["en","es"],"cmsDataSetPath":null,"sections":[{"uid":"1b98643a-ff70-498f-a8ed-a0d587959022","sectionTitle":"Sidemenu","linkId":"6d0ebf51-3cd5-4724-8711-51c172373037"},{"uid":"2917b1ac-c10b-462b-a5bb-25ffa1309bf4","sectionTitle":"Container","linkId":"6fdf1ade-64fe-491e-aacd-18c48c1e20c2"}],"pageUserGroups":[{}],"title":{},"meta":{"desc":{},"keywords":{},"socialDesc":{},"socialTitle":{},"structuredData":{}},"metaImage":""},{"id":"52d39156-2091-4aec-a3fd-92fd2f86dfb1","linkId":"52d39156-2091-4aec-a3fd-92fd2f86dfb1","name":"event-detail","folder":null,"paths":{"en":"event-detail","default":"event-detail"},"langs":["en","es"],"cmsDataSetPath":null,"sections":[{"uid":"080de0f2-365d-4493-83a6-b888d160492c","sectionTitle":"Sidemenu Events","linkId":"5928cb52-ee18-45da-98d5-930e0818b9bc"},{"uid":"1f1a2f4e-3642-4782-95d5-42fd0ab13d18","sectionTitle":"Container","linkId":"7d4e25f4-f27b-460b-98fc-e28f0333b06a"}],"pageUserGroups":[{}],"title":{},"meta":{"desc":{},"keywords":{},"socialDesc":{},"socialTitle":{},"structuredData":{}},"metaImage":""},{"id":"86932438-ea3f-442e-aa1c-5f26c6d75d60","linkId":"86932438-ea3f-442e-aa1c-5f26c6d75d60","name":"supplier-onboarding","folder":null,"paths":{"en":"supplier-onboarding","default":"supplier-onboarding"},"langs":["en","es"],"cmsDataSetPath":null,"sections":[{"uid":"109e70fc-d7fb-4a2d-acf3-b6bfdff95bad","sectionTitle":"Section","linkId":"f23b737c-a94e-4d6a-b009-d6863ada60be"}],"pageUserGroups":[{}],"title":{},"meta":{"desc":{},"keywords":{},"socialDesc":{},"socialTitle":{},"structuredData":{}},"metaImage":""},{"id":"d432b761-7ac3-472f-8320-11a5e44fe67d","linkId":"d432b761-7ac3-472f-8320-11a5e44fe67d","name":"tasks","folder":null,"paths":{"en":"tasks","default":"tasks"},"langs":["en","es"],"cmsDataSetPath":null,"sections":[{"uid":"080de0f2-365d-4493-83a6-b888d160492c","sectionTitle":"Sidemenu Events","linkId":"5928cb52-ee18-45da-98d5-930e0818b9bc"},{"uid":"3e67bd9f-b4f5-40bd-99b0-e6b28a3f4edf","sectionTitle":"Container","linkId":"a10d10d3-fefd-4b2c-b25f-13393f7aa440"}],"pageUserGroups":[{}],"title":{},"meta":{"desc":{},"keywords":{},"socialDesc":{},"socialTitle":{},"structuredData":{}},"metaImage":""},{"id":"ec4a7639-4aa7-4495-b834-3db1162b96a8","linkId":"ec4a7639-4aa7-4495-b834-3db1162b96a8","name":"login","folder":null,"paths":{"en":"login","default":"login"},"langs":["en","es"],"cmsDataSetPath":null,"sections":[{"uid":"a224c1ca-33ce-4fac-978a-1ca42fb8084c","sectionTitle":"Login","linkId":"b97061cd-71da-4643-ac78-c701392e3f0f"}],"pageUserGroups":[],"title":{},"meta":{"desc":{},"keywords":{},"socialDesc":{},"socialTitle":{},"structuredData":{}},"metaImage":""},{"id":"de851bef-aa7d-4b29-a187-77a54a3d8dce","linkId":"de851bef-aa7d-4b29-a187-77a54a3d8dce","name":"sign up","folder":null,"paths":{"en":"sign-up","default":"sign-up"},"langs":["en","es"],"cmsDataSetPath":null,"sections":[{"uid":"54e70c7d-62dc-45de-9b2b-886d5fa2438e","sectionTitle":"Login","linkId":"3738f8ee-a298-48bc-8bc8-ffc24db1831e"}],"pageUserGroups":[],"title":{},"meta":{"desc":{},"keywords":{},"socialDesc":{},"socialTitle":{},"structuredData":{}},"metaImage":""},{"id":"a6aeb5ae-3027-4cc0-87ae-3371e90aa52a","linkId":"a6aeb5ae-3027-4cc0-87ae-3371e90aa52a","name":"guests","folder":null,"paths":{"en":"guests","default":"guests"},"langs":["en","es"],"cmsDataSetPath":null,"sections":[{"uid":"080de0f2-365d-4493-83a6-b888d160492c","sectionTitle":"Sidemenu Events","linkId":"5928cb52-ee18-45da-98d5-930e0818b9bc"},{"uid":"b51f8e34-eacd-465c-b155-a06adcdd04b4","sectionTitle":"Container","linkId":"580030f6-cea9-4340-9f74-dd7935f20a28"},{"uid":"3c896a36-1fe8-42c9-a48d-68811801d290","sectionTitle":"Container","linkId":"10cc3b89-f5f4-49e5-a7d0-34fb0f16fcac"}],"pageUserGroups":[{}],"title":{},"meta":{"desc":{},"keywords":{},"socialDesc":{},"socialTitle":{},"structuredData":{}},"metaImage":""},{"id":"58043498-1e1d-4596-827f-f1c5efee94dd","linkId":"58043498-1e1d-4596-827f-f1c5efee94dd","name":"vendors","folder":null,"paths":{"en":"vendors","default":"vendors"},"langs":["en","es"],"cmsDataSetPath":null,"sections":[{"uid":"080de0f2-365d-4493-83a6-b888d160492c","sectionTitle":"Sidemenu Events","linkId":"5928cb52-ee18-45da-98d5-930e0818b9bc"},{"uid":"06dabfc8-17eb-4da6-a9e7-f06d708c4593","sectionTitle":"Container","linkId":"c5181d0d-28c7-4620-9682-83e6dfa9d780"}],"pageUserGroups":[{}],"title":{},"meta":{"desc":{},"keywords":{},"socialDesc":{},"socialTitle":{},"structuredData":{}},"metaImage":""},{"id":"2b8ed45c-2caf-42e6-b313-554c9882b9fc","linkId":"2b8ed45c-2caf-42e6-b313-554c9882b9fc","name":"event-finances","folder":null,"paths":{"en":"event-finances","default":"event-finances"},"langs":["en","es"],"cmsDataSetPath":null,"sections":[{"uid":"080de0f2-365d-4493-83a6-b888d160492c","sectionTitle":"Sidemenu Events","linkId":"5928cb52-ee18-45da-98d5-930e0818b9bc"},{"uid":"3ac00ab8-dceb-47a8-87da-64c8134b2775","sectionTitle":"Container","linkId":"b2f9eb6a-9dd1-476d-b61b-b65737d23377"}],"pageUserGroups":[{}],"title":{},"meta":{"desc":{},"keywords":{},"socialDesc":{},"socialTitle":{},"structuredData":{}},"metaImage":""},{"id":"f55540b0-f6af-4798-9105-85d42f36965c","linkId":"f55540b0-f6af-4798-9105-85d42f36965c","name":"event-settings","folder":null,"paths":{"en":"event-settings","default":"event-settings"},"langs":["en","es"],"cmsDataSetPath":null,"sections":[{"uid":"080de0f2-365d-4493-83a6-b888d160492c","sectionTitle":"Sidemenu Events","linkId":"5928cb52-ee18-45da-98d5-930e0818b9bc"},{"uid":"1847ca59-d212-4953-b120-6374fd78f200","sectionTitle":"Container","linkId":"d2b9563f-4874-49ab-846e-ec1028dbb972"}],"pageUserGroups":[{}],"title":{},"meta":{"desc":{},"keywords":{},"socialDesc":{},"socialTitle":{},"structuredData":{}},"metaImage":""},{"id":"b4fff723-a7f7-4ba9-81f9-f0a6a1a728ec","linkId":"b4fff723-a7f7-4ba9-81f9-f0a6a1a728ec","name":"rsvp","folder":null,"paths":{"en":"rsvp","default":"rsvp"},"langs":["en","es"],"cmsDataSetPath":null,"sections":[{"uid":"080de0f2-365d-4493-83a6-b888d160492c","sectionTitle":"Sidemenu Events","linkId":"5928cb52-ee18-45da-98d5-930e0818b9bc"},{"uid":"eb0da7d7-8a9f-44ac-bd35-deca53055d14","sectionTitle":"Container","linkId":"a0f380b6-dc58-45e8-9c15-664d4da5693f"}],"pageUserGroups":[{}],"title":{},"meta":{"desc":{},"keywords":{},"socialDesc":{},"socialTitle":{},"structuredData":{}},"metaImage":""},{"id":"b5f7790a-013e-459c-9794-90e8ed99d4de","linkId":"b5f7790a-013e-459c-9794-90e8ed99d4de","name":"rsvp-confirmation","folder":null,"paths":{"en":"invite-event","default":"invite-event"},"langs":["en"],"cmsDataSetPath":null,"sections":[{"uid":"9e6f86c5-0591-45c3-9f7a-b816d7251a59","sectionTitle":"RSVP","linkId":"038c1a08-1600-415f-a694-5f18eee0e2d6"}],"pageUserGroups":[],"title":{"en":"","fr":"Vide | Commencer à partir de zéro"},"meta":{"desc":{},"keywords":{},"socialDesc":{},"socialTitle":{},"structuredData":{}},"metaImage":""},{"id":"989e3f62-90c4-47f9-b0f2-4af7fe9892a9","linkId":"989e3f62-90c4-47f9-b0f2-4af7fe9892a9","name":"test","folder":null,"paths":{"en":"test","default":"test"},"langs":["en","es"],"cmsDataSetPath":null,"sections":[{"uid":"93f42efe-14c4-4728-99bb-07a6ab90699e","sectionTitle":"Section","linkId":"7147cce8-f3da-41b2-a2b9-4d863df42d25"}],"pageUserGroups":[],"title":{},"meta":{"desc":{},"keywords":{},"socialDesc":{},"socialTitle":{},"structuredData":{}},"metaImage":""}],"plugins":[{"id":"f9ef41c3-1c53-4857-855b-f2f6a40b7186","name":"Supabase","namespace":"supabase"},{"id":"1c5f5c0f-5609-4031-9e57-5bb4811be7b3","name":"Youtube","namespace":"youtube"},{"id":"1fa0dd68-5069-436c-9a7d-3b54c340f1fa","name":"Supabase Auth","namespace":"supabaseAuth"},{"id":"cabb43dd-6161-4140-8ebf-03b6fb045a0b","name":"Google","namespace":"google"},{"id":"832d6f7a-42c3-43f1-a3ce-9a678272f811","name":"Date","namespace":"dayjs"},{"id":"2bd1c688-31c5-443e-ae25-59aa5b6431fb","name":"REST API","namespace":"restApi"}]};
// eslint-disable-next-line no-undef
window.wwg_cacheVersion = 74;
// eslint-disable-next-line no-undef
window.wwg_pluginsSettings = pluginsSettings;
// eslint-disable-next-line no-undef
window.wwg_disableManifest = false;

const defaultLang = window.wwg_designInfo.langs.find(({ default: isDefault }) => isDefault) || {};

const registerRoute = (page, lang, forcedPath) => {
    const langSlug = !lang.default || lang.isDefaultPath ? `/${lang.lang}` : '';
    let path =
        forcedPath ||
        (page.id === window.wwg_designInfo.homePageId ? '/' : `/${page.paths[lang.lang] || page.paths.default}`);

    //Replace params
    path = path.replace(/{{([\w]+)\|([^/]+)?}}/g, ':$1');

    routes.push({
        path: langSlug + path,
        component: wwPage,
        name: `page-${page.id}-${lang.lang}`,
        meta: {
            pageId: page.id,
            lang,
            isPrivate: !!page.pageUserGroups?.length,
        },
        async beforeEnter(to, from) {
            if (to.name === from.name) return;
            //Set page lang
            wwLib.wwLang.defaultLang = defaultLang.lang;
            wwLib.$store.dispatch('front/setLang', lang.lang);

            //Init plugins
            await initializePlugins();

            //Check if private page
            if (page.pageUserGroups?.length) {
                // cancel navigation if no plugin
                if (!wwLib.wwAuth.plugin) {
                    return false;
                }

                await wwLib.wwAuth.init();

                // Redirect to not sign in page if not logged
                if (!wwLib.wwAuth.getIsAuthenticated()) {
                    window.location.href = `${wwLib.wwPageHelper.getPagePath(
                        wwLib.wwAuth.getUnauthenticatedPageId()
                    )}?_source=${to.path}`;

                    return null;
                }

                //Check roles are required
                if (
                    page.pageUserGroups.length > 1 &&
                    !wwLib.wwAuth.matchUserGroups(page.pageUserGroups.map(({ userGroup }) => userGroup))
                ) {
                    window.location.href = `${wwLib.wwPageHelper.getPagePath(
                        wwLib.wwAuth.getUnauthorizedPageId()
                    )}?_source=${to.path}`;

                    return null;
                }
            }

            try {
                await import(`@/pages/${page.id.split('_')[0]}.js`);
                await wwLib.wwWebsiteData.fetchPage(page.id);

                //Scroll to section or on top after page change
                if (to.hash) {
                    const targetElement = document.getElementById(to.hash.replace('#', ''));
                    if (targetElement) targetElement.scrollIntoView();
                } else {
                    document.body.scrollTop = document.documentElement.scrollTop = 0;
                }

                return;
            } catch (err) {
                wwLib.$store.dispatch('front/showPageLoadProgress', false);

                if (err.redirectUrl) {
                    return { path: err.redirectUrl || '404' };
                } else {
                    //Any other error: go to target page using window.location
                    window.location = to.fullPath;
                }
            }
        },
    });
};

for (const page of window.wwg_designInfo.pages) {
    for (const lang of window.wwg_designInfo.langs) {
        if (!page.langs.includes(lang.lang)) continue;
        registerRoute(page, lang);
    }
}

const page404 = window.wwg_designInfo.pages.find(page => page.paths.default === '404');
if (page404) {
    for (const lang of window.wwg_designInfo.langs) {
        // Create routes /:lang/:pathMatch(.*)* etc for all langs of the 404 page
        if (!page404.langs.includes(lang.lang)) continue;
        registerRoute(
            page404,
            {
                default: false,
                lang: lang.lang,
            },
            '/:pathMatch(.*)*'
        );
    }
    // Create route /:pathMatch(.*)* using default project lang
    registerRoute(page404, { default: true, isDefaultPath: false, lang: defaultLang.lang }, '/:pathMatch(.*)*');
} else {
    routes.push({
        path: '/:pathMatch(.*)*',
        async beforeEnter() {
            window.location.href = '/404';
        },
    });
}

let routerOptions = {};

const isProd =
    !window.location.host.includes(
        // TODO: add staging2 ?
        '-staging.' + (process.env.WW_ENV === 'staging' ? import.meta.env.VITE_APP_PREVIEW_URL : '')
    ) && !window.location.host.includes(import.meta.env.VITE_APP_PREVIEW_URL);

if (isProd && window.wwg_designInfo.baseTag?.href) {
    let baseTag = window.wwg_designInfo.baseTag.href;
    if (!baseTag.startsWith('/')) {
        baseTag = '/' + baseTag;
    }
    if (!baseTag.endsWith('/')) {
        baseTag += '/';
    }

    routerOptions = {
        base: baseTag,
        history: createWebHistory(baseTag),
        routes,
    };
} else {
    routerOptions = {
        history: createWebHistory(),
        routes,
    };
}

router = createRouter({
    ...routerOptions,
    scrollBehavior,
});

//Trigger on page unload
let isFirstNavigation = true;
router.beforeEach(async (to, from) => {
    if (to.name === from.name) return;
    if (!isFirstNavigation) await onPageUnload();
    isFirstNavigation = false;
    wwLib.globalVariables._navigationId++;
    return;
});

//Init page
router.afterEach((to, from, failure) => {
    wwLib.$store.dispatch('front/showPageLoadProgress', false);
    let fromPath = from.path;
    let toPath = to.path;
    if (!fromPath.endsWith('/')) fromPath = fromPath + '/';
    if (!toPath.endsWith('/')) toPath = toPath + '/';
    if (failure || (from.name && toPath === fromPath)) return;
    initializeData(to);
});
/* wwFront:end */

export default router;
