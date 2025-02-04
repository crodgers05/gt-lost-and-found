"use client";
import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Database } from "@/supabase";
import DisplayMap from "./DisplayMap";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { AuthError, PostgrestError, User } from "@supabase/supabase-js";
import { useRouter, useSearchParams } from "next/navigation";
import ClaimItem from "./ClaimItem";
import Overlay from "./Overlay";
import { usePathname } from "next/navigation";
import { FaCheck } from "react-icons/fa";
import Link from "next/link";
import ClipLoader from "react-spinners/ClipLoader";
import { notFound } from "next/navigation";
import {
  Pin,
  fetchClaims,
  fetchPin,
  fetchUser,
  fetchProfile,
} from "@/db/database";
import { PinRequest } from "@/db/database";

type componentMap = {
  [key: string]: JSX.Element;
};

type stringMap = {
  [key: string]: string;
};

/**
 * The display component for a lost item.
 *
 * @param apiKey The Google Maps API key
 * @returns The LostItemDisplay component that displays the lost item.
 */
const LostItemDisplay = ({ apiKey }: { apiKey: string }) => {
  const supabase = createClient();

  const [item, setItem] = useState<Pin>();
  const [loadMap, setLoadMap] = useState<boolean>(false);
  const [user, setUser] = useState<User>();
  const [username, setUsername] = useState<string>("");
  const [claimState, setClaimState] = useState<string>("loading");

  const claimStates = {
    notSignedIn: "notSignedIn",
    claimed: "claimed",
    notClaimed: "notClaimed",
    pinOwner: "pinOwner",
  };

  const search = useSearchParams();
  const pathname = usePathname();
  const claim = search.get("claim") == "true" ? true : false;

  const [itemID, setItemID] = useState<string>("");
  const [pinCreatorID, setPinCreatorID] = useState<string>("");
  const [currentClaims, setCurrentClaims] = useState<number>(0);
  const [screenWidth, setScreenWidth] = useState<number>(0);
  const router = useRouter();

  useEffect(() => {
    setScreenWidth(window.innerWidth);
  }, []);

  useEffect(() => {
    const fetchAllInfo = async () => {
      const item_id = window.location.pathname.split("/")[2];
      setItemID(item_id);

      const data = await fetchPin(item_id);

      if ("message" in data || !data) {
        notFound();
      }

      setItem(data);
      setCurrentClaims(data.claim_requests ? data.claim_requests : 0);
      setPinCreatorID(data.creator_id);
      setLoadMap(true);

      const userData = await fetchUser();

      if (userData instanceof AuthError || !userData) {
        setClaimState(claimStates.notSignedIn);
        return;
      }

      setUser(userData);

      const profile = await fetchProfile(userData.id);

      if ("message" in profile || profile.username === null) {
        return;
      }

      setUsername(profile.username);

      if (userData.id === data.creator_id) {
        setClaimState(claimStates.pinOwner);
        return;
      }

      const requests: PinRequest[] | PostgrestError = await fetchClaims(
        item_id,
        userData,
      );

      if ("message" in requests) {
        return;
      }

      if (requests.length > 0) {
        setClaimState(claimStates.claimed);
      } else {
        setClaimState(claimStates.notClaimed);
      }
    };

    fetchAllInfo();
  }, []);

  useEffect(() => {
    console.log(claimState);
  }, [claimState]);

  useEffect(() => {
    const channel = supabase
      .channel("realtime-pins")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pins",
          filter: `item_id=eq.${itemID}`,
        },
        (payload) => {
          setItem(payload.new as Database["public"]["Tables"]["pins"]["Row"]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, item, setItem]);

  const buttonComponentMap: componentMap = {
    notClaimed: <p>Claim Item</p>,
    claimed: (
      <p className="flex flex-row items-center gap-2">
        <FaCheck /> Request Submitted
      </p>
    ),
    pinOwner: <p>You are the finder of this item.</p>,
    notSignedIn: <p>Sign In to Claim</p>,
    loading: <ClipLoader color="#B3A369" />,
  };

  const stylesMap: stringMap = {
    notClaimed: "border-gtGold bg-gtGoldHover hover:opacity-80",
    claimed: "cursor-default bg-green-500 border-green-600",
    pinOwner: "cursor-default bg-gtGold border-gtGoldHover",
    notSignedIn: "border-gtGold bg-gtGoldHover hover:opacity-80",
    loading: "cursor-default bg-gtGoldHover border-gtGold",
  };

  const linkMap: stringMap = {
    notClaimed: pathname + "?claim=true",
    claimed: "",
    pinOwner: "",
    notSignedIn: "/login",
    loading: "",
  };

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 py-24 text-white tb:flex-row tb:pt-0">
      {claim ? (
        <div className="fixed z-30 flex h-full w-full items-center justify-center">
          <ClaimItem
            path={pathname}
            itemID={itemID}
            pin_creator_id={pinCreatorID}
            username={username}
            claimStatus={claimState}
            userID={user instanceof AuthError ? "" : user ? user.id : ""}
            setClaimStatus={setClaimState}
            user={user ? true : false}
          />
          <Overlay
            on={claim}
            setOn={() => {
              router.push(`${pathname}?claim=false`);
            }}
            zIndex="z-30"
            clear={false}
          />
        </div>
      ) : null}
      <div className="flex h-[65%] w-[80%] flex-col items-center gap-4 tb:w-[30%]">
        <div className="flex h-[70%] w-full flex-row gap-4">
          <div className="flex h-full w-1/2 flex-col items-center gap-4">
            <div className="flex h-[30%] w-full items-center justify-center rounded-lg border-[1px] border-gray-500 bg-mainHover">
              <h1 className="text-lg font-semibold text-gtGold">
                {item?.item || (
                  <Skeleton height={20} width={80} baseColor="#B3A369" />
                )}
              </h1>
            </div>
            <div className="flex h-[70%] w-full flex-col items-center justify-center rounded-lg border-[1px] border-gray-500 bg-mainHover">
              <p className="px-2 text-xl text-gtGold">
                {item?.created_at?.slice(0, 10) || (
                  <Skeleton height={20} width={120} baseColor="#B3A369" />
                )}
              </p>
            </div>
          </div>
          <div className="flex h-full w-1/2 flex-col items-center justify-center rounded-lg border-[1px] border-gray-500 bg-mainHover">
            <h1 className="text-8xl text-gtGold tb:text-9xl">
              {item?.claim_requests != null ? (
                item?.claim_requests
              ) : (
                <Skeleton
                  height={screenWidth < 450 ? 80 : 100}
                  width={screenWidth < 450 ? 80 : 100}
                  baseColor="#B3A369"
                />
              )}
            </h1>
            <p className="pb-2 text-sm text-gray-400">Claim Requests</p>
          </div>
        </div>
        <div className="flex h-[60%] w-full flex-col justify-between rounded-lg border-[1px] border-gray-500 bg-mainHover p-4">
          <h1 className="text-xl font-semibold text-gtGold tb:text-2xl">
            Found by{" "}
            {item?.user_name || (
              <Skeleton height={20} width={120} baseColor="#B3A369" />
            )}
          </h1>
          <p className="h-40 text-sm text-gtGold">
            {item?.description ? (
              item?.description
            ) : (
              <Skeleton height={20} width={120} baseColor="#B3A369" />
            )}
          </p>

          <Link
            href={linkMap[claimState]}
            className={`flex items-center justify-center gap-2 p-4 text-sm text-white 
            ${stylesMap[claimState]} h-10 w-full rounded-lg border-[1px] duration-300`}
          >
            {buttonComponentMap[claimState]}
          </Link>
        </div>
      </div>
      <div className="flex h-[40%] w-[80%] rounded-lg border-[1px] border-gray-500 bg-mainHover tb:h-[65%] tb:w-[60%]">
        {loadMap ? (
          <DisplayMap
            apiKey={apiKey}
            lat={item?.x_coordinate ? item.x_coordinate : 0}
            lng={item?.y_coordinate ? item.y_coordinate : 0}
            item={item?.item ? item.item : ""}
          />
        ) : null}
      </div>
    </div>
  );
};

export default LostItemDisplay;
