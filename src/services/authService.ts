
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
    type User,
} from "firebase/auth";

import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../firebase/config";

export interface ShopUser {
    uid: string;
    email: string;
    displayName: string;
    shopId: string;
    shopName: string;
}

export const signupUser = async (
    email: string,
    password: string,
    shopName: string
): Promise<User> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanShopName = shopName.trim();

    if (!cleanShopName) {
        throw new Error("Please enter your shop name.");
    }

    const credential = await createUserWithEmailAndPassword(
        auth,
        cleanEmail,
        password
    );

    const user = credential.user;

    await updateProfile(user, {
        displayName: cleanShopName,
    });

    const shopId = user.uid;

    const profile: ShopUser = {
        uid: user.uid,
        email: cleanEmail,
        displayName: cleanShopName,
        shopId,
        shopName: cleanShopName,
    };

    await setDoc(doc(db, "users", user.uid), {
        ...profile,
        createdAt: serverTimestamp(),
    });

    await setDoc(doc(db, "shops", shopId), {
        shopId,
        ownerUid: user.uid,
        name: cleanShopName,
        createdAt: serverTimestamp(),
    });

    return user;
};

export const loginUser = async (
    email: string,
    password: string
): Promise<User> => {
    const credential = await signInWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password
    );

    return credential.user;
};

export const loadShopUser = async (
    user: User
): Promise<ShopUser> => {
    const userRef = doc(db, "users", user.uid);
    const shopId = user.uid;

    const userSnapshot = await getDoc(userRef);

    if (!userSnapshot.exists()) {
        throw new Error(
            "Shop profile not found. Please contact support."
        );
    }

    const existingData = userSnapshot.data();

    if (existingData.shopId !== shopId) {
        throw new Error("Invalid shop account configuration.");
    }

    const shopRef = doc(db, "shops", shopId);
    const shopSnapshot = await getDoc(shopRef);

    if (!shopSnapshot.exists()) {
        throw new Error("Shop information not found.");
    }

    const shopData = shopSnapshot.data();

    if (shopData.ownerUid !== user.uid) {
        throw new Error("You do not have access to this shop.");
    }

    return {
        uid: user.uid,
        email: user.email ?? "",
        displayName:
            existingData.displayName ??
            user.displayName ??
            "",
        shopId,
        shopName:
            shopData.name ??
            existingData.shopName ??
            "",
    };
};

export const logoutUser = async (): Promise<void> => {
    await signOut(auth);
};
