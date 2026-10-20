// =========================================================
// AfflixNova — signup.js
// Email/password + Google authentication
// Firebase JS SDK 13.0.0
// =========================================================

import { auth, db } from "./firebase.js";

import {
    createUserWithEmailAndPassword,
    updateProfile,
    sendEmailVerification,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    signOut
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
    doc,
    getDoc,
    runTransaction,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";


// =========================================================
// SETTINGS
// =========================================================

const TERMS_VERSION = "2026-10";
const NEXT_PAGE = "index.html";


// =========================================================
// COUNTIES
// =========================================================

const COUNTIES = [
    "Baringo",
    "Bomet",
    "Bungoma",
    "Busia",
    "Elgeyo-Marakwet",
    "Embu",
    "Garissa",
    "Homa Bay",
    "Isiolo",
    "Kajiado",
    "Kakamega",
    "Kericho",
    "Kiambu",
    "Kilifi",
    "Kirinyaga",
    "Kisii",
    "Kisumu",
    "Kitui",
    "Kwale",
    "Laikipia",
    "Lamu",
    "Machakos",
    "Makueni",
    "Mandera",
    "Marsabit",
    "Meru",
    "Migori",
    "Mombasa",
    "Murang'a",
    "Nairobi",
    "Nakuru",
    "Nandi",
    "Narok",
    "Nyamira",
    "Nyandarua",
    "Nyeri",
    "Samburu",
    "Siaya",
    "Taita-Taveta",
    "Tana River",
    "Tharaka-Nithi",
    "Trans Nzoia",
    "Turkana",
    "Uasin Gishu",
    "Vihiga",
    "Wajir",
    "West Pokot"
];


// =========================================================
// DOM
// =========================================================

const form = document.getElementById("signup-form");
const submitBtn = document.getElementById("submit");
const formError = document.getElementById("form-error");

const countySelect = document.getElementById("county");

const pw = document.getElementById("password");
const pwToggle = document.getElementById("pw-toggle");

const googleSignupBtn = document.getElementById("google-signup");

let submitting = false;


// =========================================================
// COUNTY LIST
// =========================================================

COUNTIES.forEach((county) => {
    countySelect.add(new Option(county, county));
});


// =========================================================
// PASSWORD SHOW / HIDE
// =========================================================

pwToggle.addEventListener("click", () => {

    const show = pw.type === "password";

    pw.type = show ? "text" : "password";

    pwToggle.textContent = show ? "Hide" : "Show";

    pwToggle.setAttribute(
        "aria-label",
        show ? "Hide password" : "Show password"
    );

    pwToggle.setAttribute(
        "aria-pressed",
        String(show)
    );
});


// =========================================================
// M-PESA NORMALIZATION
// =========================================================

// Accepts:
// 0712 345 678
// 0712345678
// +254712345678
// 254712345678
// 0112345678

function normalizeMpesa(raw) {

    const s = String(raw)
        .replace(/[\s\-().]/g, "");

    const match = s.match(/^(?:\+?254|0)([17]\d{8})$/);

    return match
        ? "254" + match[1]
        : null;
}


// =========================================================
// ADVERTISER CODE
// =========================================================

const ALPHABET =
    "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomChars(length) {

    const buffer =
        new Uint32Array(length);

    crypto.getRandomValues(buffer);

    return Array.from(
        buffer,
        (value) =>
            ALPHABET[value % ALPHABET.length]
    ).join("");
}


function makeCode(fullName) {

    const letters =
        fullName
            .toUpperCase()
            .replace(/[^A-Z]/g, "");

    return (
        letters.slice(0, 3).padEnd(3, "X")
        + "-"
        + randomChars(4)
    );
}


// =========================================================
// COLLECT FORM
// =========================================================

function collect() {

    const value = (id) =>
        document.getElementById(id).value.trim();

    const checked = (name) =>
        [
            ...form.querySelectorAll(
                `input[name="${name}"]:checked`
            )
        ].map((input) => input.value);

    return {

        fullName:
            value("fullName")
                .replace(/\s+/g, " "),

        email:
            value("email").toLowerCase(),

        password:
            pw.value,

        county:
            countySelect.value,

        city:
            value("city"),

        mpesa:
            value("mpesa"),

        platforms:
            checked("platforms"),

        categories:
            checked("categories"),

        over18:
            document.getElementById("over18").checked,

        terms:
            document.getElementById("terms").checked
    };
}


// =========================================================
// VALIDATION
// =========================================================

function validate(v, mode = "email") {

    const errors = {};

    if (!/^\S+(?:\s+\S+)+$/.test(v.fullName)) {

        errors.fullName =
            "Enter your first and last name.";
    }


    // Google provides the email address.
    if (mode === "email") {

        if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
                .test(v.email)
        ) {

            errors.email =
                "Enter a valid email address.";
        }


        if (v.password.length < 8) {

            errors.password =
                "Use at least 8 characters.";
        }
    }


    if (!COUNTIES.includes(v.county)) {

        errors.county =
            "Choose your county.";
    }


    if (v.city.length < 2) {

        errors.city =
            "Enter your nearest city or town.";
    }


    if (!normalizeMpesa(v.mpesa)) {

        errors.mpesa =
            "Enter a valid M-Pesa number, like 0712 345 678.";
    }


    if (!v.platforms.length) {

        errors.platforms =
            "Choose at least one platform.";
    }


    if (!v.categories.length) {

        errors.categories =
            "Choose at least one category.";
    }


    if (!v.over18) {

        errors.over18 =
            "You must be 18 or older to join.";
    }


    if (!v.terms) {

        errors.terms =
            "Please agree to the Terms and the Privacy Policy.";
    }


    return errors;
}


// =========================================================
// ERROR HANDLING
// =========================================================

function clearErrors() {

    form.querySelectorAll(".err").forEach((element) => {

        element.textContent = "";
    });


    form.querySelectorAll(".invalid").forEach((element) => {

        element.classList.remove("invalid");
    });


    formError.hidden = true;
    formError.textContent = "";
}


function showErrors(errors) {

    Object.entries(errors).forEach(
        ([name, message]) => {

            const errorElement =
                document.getElementById(
                    "err-" + name
                );

            if (errorElement) {

                errorElement.textContent =
                    message;
            }


            const holder =
                form.querySelector(
                    `[data-field="${name}"]`
                );

            if (holder) {

                holder.classList.add("invalid");
            }
        }
    );


    const first =
        form.querySelector(".invalid");


    if (first) {

        const focusable =
            first.matches("input, select")
                ? first
                : first.querySelector(
                    "input, select"
                );


        if (focusable) {

            focusable.focus({
                preventScroll: true
            });
        }


        first.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }
}


function showFormError(message) {

    formError.textContent = message;
    formError.hidden = false;

    formError.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}


// =========================================================
// BUTTON STATE
// =========================================================

function setBusy(busy, google = false) {

    submitBtn.disabled = busy;

    submitBtn.textContent =
        busy
            ? "Creating your account..."
            : "Create my account";


    if (googleSignupBtn) {

        googleSignupBtn.disabled = busy;

        googleSignupBtn.textContent =
            busy && google
                ? "Connecting to Google..."
                : "Continue with Google";
    }
}


// =========================================================
// FIREBASE ERROR MESSAGES
// =========================================================

function friendly(error) {

    switch (error?.code) {

        case "auth/email-already-in-use":
            return "An account with this email already exists. Try logging in instead.";

        case "auth/invalid-email":
            return "That email address does not look right.";

        case "auth/weak-password":
            return "Choose a stronger password of at least 8 characters.";

        case "auth/network-request-failed":
            return "No connection. Check your internet and try again.";

        case "auth/too-many-requests":
            return "Too many attempts. Please wait a moment and try again.";

        case "auth/popup-closed-by-user":
            return "The Google sign-in window was closed. You can try again.";

        case "auth/popup-blocked":
            return "Your browser blocked the Google sign-in popup. Please allow popups for this site.";

        case "auth/cancelled-popup-request":
            return "The Google sign-in request was cancelled.";

        case "auth/account-exists-with-different-credential":
            return "An account already exists with this email using another sign-in method. Please use Log in instead.";

        case "permission-denied":
        case "firestore/permission-denied":
            return "We could not save your details. Please try again.";

        case "code-unavailable":
            return "We could not create your personal advertiser code. Please try again.";

        default:
            console.error("Firebase error:", error);
            return "Something went wrong. Please try again.";
    }
}


// =========================================================
// CREATE PROFILE + UNIQUE CODE
// =========================================================

async function createProfile(uid, v) {

    for (let attempt = 0; attempt < 6; attempt++) {

        const code = makeCode(v.fullName);

        const codeRef =
            doc(db, "codes", code);

        const userRef =
            doc(db, "users", uid);


        try {

            await runTransaction(
                db,
                async (transaction) => {

                    const taken =
                        await transaction.get(codeRef);


                    if (taken.exists()) {

                        throw Object.assign(
                            new Error("Code already exists"),
                            {
                                code: "code-taken"
                            }
                        );
                    }


                    transaction.set(
                        codeRef,
                        {
                            uid,
                            createdAt:
                                serverTimestamp()
                        }
                    );


                    transaction.set(
                        userRef,
                        {
                            fullName:
                                v.fullName,

                            email:
                                v.email,

                            mpesa:
                                normalizeMpesa(
                                    v.mpesa
                                ),

                            county:
                                v.county,

                            city:
                                v.city,

                            platforms:
                                v.platforms,

                            categories:
                                v.categories,

                            code,

                            over18:
                                true,

                            termsAcceptedAt:
                                serverTimestamp(),

                            termsVersion:
                                TERMS_VERSION,

                            status:
                                "active",

                            createdAt:
                                serverTimestamp()
                        }
                    );
                }
            );


            return code;

        } catch (error) {

            if (
                error.code !==
                "code-taken"
            ) {

                throw error;
            }
        }
    }


    throw Object.assign(
        new Error("Could not create code"),
        {
            code:
                "code-unavailable"
        }
    );
}


// =========================================================
// CHECK WHETHER FIRESTORE PROFILE EXISTS
// =========================================================

async function profileExists(uid) {

    const userRef =
        doc(db, "users", uid);

    const snapshot =
        await getDoc(userRef);

    return snapshot.exists();
}


// =========================================================
// EMAIL/PASSWORD SIGNUP
// =========================================================

form.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        if (submitting) {
            return;
        }


        clearErrors();


        const values =
            collect();


        const errors =
            validate(values, "email");


        if (Object.keys(errors).length) {

            showErrors(errors);
            return;
        }


        submitting = true;
        setBusy(true);


        let credential = null;


        try {

            credential =
                await createUserWithEmailAndPassword(
                    auth,
                    values.email,
                    values.password
                );


            await updateProfile(
                credential.user,
                {
                    displayName:
                        values.fullName
                }
            );


            await createProfile(
                credential.user.uid,
                values
            );


            // Email verification is helpful but
            // does not prevent account creation.
            try {

                await sendEmailVerification(
                    credential.user
                );

            } catch (verificationError) {

                console.warn(
                    "Email verification could not be sent:",
                    verificationError
                );
            }


            location.href =
                NEXT_PAGE;

        } catch (error) {

            if (
                credential?.user
            ) {

                try {

                    await credential.user.delete();

                } catch (deleteError) {

                    console.warn(
                        "Could not roll back auth user:",
                        deleteError
                    );
                }
            }


            showFormError(
                friendly(error)
            );


            submitting = false;
            setBusy(false);
        }
    }
);


// =========================================================
// GOOGLE SIGNUP
// =========================================================

if (googleSignupBtn) {

    googleSignupBtn.addEventListener(
        "click",
        async () => {

            if (submitting) {
                return;
            }


            clearErrors();


            /*
             * Google supplies the name and email,
             * but the advertiser still needs to
             * complete the business/profile details.
             */

            const values =
                collect();


            const errors =
                validate(values, "google");


            if (Object.keys(errors).length) {

                showErrors(errors);

                showFormError(
                    "Please complete the required profile information before continuing with Google."
                );

                return;
            }


            submitting = true;

            setBusy(true, true);


            try {

                const provider =
                    new GoogleAuthProvider();


                provider.setCustomParameters({
                    prompt: "select_account"
                });


                const result =
                    await signInWithPopup(
                        auth,
                        provider
                    );


                const user =
                    result.user;


                /*
                 * Google gives us the verified
                 * email and display name.
                 */

                values.email =
                    (
                        user.email || ""
                    ).toLowerCase();


                values.fullName =
                    user.displayName ||
                    values.fullName;


                /*
                 * Check whether a profile already
                 * exists for this Firebase account.
                 */

                const alreadyExists =
                    await profileExists(
                        user.uid
                    );


                if (alreadyExists) {

                    location.href =
                        NEXT_PAGE;

                    return;
                }


                /*
                 * Create the advertiser profile
                 * using the Google-authenticated UID.
                 */

                await createProfile(
                    user.uid,
                    values
                );


                location.href =
                    NEXT_PAGE;

            } catch (error) {

                console.error(
                    "Google signup error:",
                    error
                );


                /*
                 * We deliberately do not delete
                 * the Google account here.
                 *
                 * If Firestore fails, the user can
                 * retry completing their profile.
                 */

                showFormError(
                    friendly(error)
                );


                submitting = false;
                setBusy(false);
            }
        }
    );
}


// =========================================================
// ALREADY AUTHENTICATED?
// =========================================================

onAuthStateChanged(
    auth,
    async (user) => {

        if (
            user &&
            !submitting
        ) {

            location.replace(
                NEXT_PAGE
            );
        }
    }
);