"use client";
import React, { useEffect, useState } from "react";
import { fetchUserRequests, fetchUser, Pin, fetchPin } from "@/db/database";
import { AuthError, User } from "@supabase/supabase-js";
import { PinRequest } from "@/db/database";
import { IoIosArrowBack } from "react-icons/io";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FaFilter } from "react-icons/fa";

const MyRequests = () => {
  const [pins, setPins] = useState<Pin[]>([]);
  const [pinToRequests, setPinToRequests] = useState<Map<string, PinRequest>>();
  const [user, setUser] = useState<User>();
  const [ loading, setLoading ] = useState<boolean>(true);

  const params = useSearchParams();
  const filter = params.get("filter") || "all";

  useEffect(() => {
    const getUserPinsAndRequests = async () => {
      const data = await fetchUser();

      if (data instanceof AuthError) {
        console.error(data);
        return;
      }

      setUser(data);

      const userRequests = await fetchUserRequests(data.id);

      if ("message" in userRequests) {
        return;
      }

      let userPins: Pin[] = [];

      for (const request of userRequests) {
        const pin = await fetchPin(request.item_id ? request.item_id : "");

        if ("message" in pin) {
          return;
        }

        userPins.push(pin);
      }

      let pinRequests = new Map<string, PinRequest>();

      for (let i = 0; i < userPins.length; i++) {
        pinRequests.set(userPins[i].item_id, userRequests[i]);
      }

      setPins(userPins);
      setPinToRequests(pinRequests);
      setLoading(false);
    };

    getUserPinsAndRequests();
  }, []);

  const filterElement = (filter: string, request: PinRequest | undefined): boolean => {

    if (!request) {
      return false;
    }

    switch (filter) {
      case "accepted":
        return request.status === "accepted";
      case "rejected":
        return request.status === "rejected";
      case "undecided":
        return request.status === "undecided";
      default:
        return true;
    }
  };

  const decideColor = (status: string | undefined) => {
    if (status === "undecided") {
      return "text-gray-400";
    } else if (status === "accepted") {
      return "text-green-400";
    } else {
      return "text-red-400";
    }
  };

  return (
    <div className="flex flex-row gap-4 w-full h-full">
      {loading?

        <div className="flex flex-row gap-4">
          <div className="flex flex-col bg-mainTheme border-[1px] border-gray-500 items-center justify-center w-96 h-48 shadow-lg rounded-lg">
            <div className="w-full h-full duration-300 rounded-lg bg-mainHover2 animate-pulse" />
          </div>
          <div className="flex flex-col bg-mainTheme border-[1px] border-gray-500 items-center justify-center w-96 h-48 shadow-lg rounded-lg">
            <div className="w-full h-full duration-300 rounded-lg bg-mainHover2 animate-pulse" />
          </div>
        </div>

        :

        <div className="flex flex-wrap gap-4 w-full">
          {pins.map((pin) => (
            <div
              key={pin.item_id}
              className={`${filterElement(filter, pinToRequests?.get(pin.item_id))? 'flex' : 'hidden'} flex-col justify-between w-96 h-48 cursor-pointer bg-mainHover hover:bg-mainHover2 duration-300 border-[1px] border-gray-400 rounded-lg p-4 gap-4`}
            >
              <div className="flex flex-row justify-between">
                <div className="flex flex-col">
                  <h1 className="text-base text-gtGold font-bold">{pin.item}</h1>
                  <p className="text-xs text-gray-400">{pin.description}</p>
                </div>
                <p
                  className={`text-xs ${decideColor(
                    pinToRequests?.get(pin.item_id)?.status
                  )}`}
                >
                  {pinToRequests?.get(pin.item_id)?.status}
                </p>
              </div>
              <div className="flex items-end justify-between p-2 rounded-lg">
                <h2 className={`text-base`}>
                  {pinToRequests?.get(pin.item_id)?.description}
                </h2>
                <p className="text-xs text-gray-400">
                  Click for more Info
                </p>
              </div>
            </div>
          ))}
        </div>
      }
      <FilterComponent filter={filter} />
    </div>
  );
};

const FilterComponent = ({ filter }: { filter: string }) => {
  const [hideOptions, setHideOptions] = useState<boolean>(true);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const path = usePathname();

  const options = ["All", "Accepted", "Rejected", "Undecided"];

  const handleChange = (value: string) => {
    setSelectedFilter(value);
  };

  return (
    <div className="flex flex-col duration-300 right-10 absolute text-white self-start p-4 gap-4 w-52 rounded-lg bg-mainHover border-[1px] border-gray-500">
      <div className="flex flex-row w-full items-center justify-between gap-2 duration-300">
        <h1 className="text-sm">Filtered by: {filter}</h1>
        <button
          onClick={() => setHideOptions(!hideOptions)}
          className="flex p-2 rounded-lg border-gray-400 border-[1px] hover:bg-mainHover2 duration-300"
        >
          <FaFilter className="text-gtGold text-base" />
        </button>
      </div>
      <div className={`${hideOptions ? "hidden" : "flex"} flex-col gap-2`}>
        <ol>
          {options.map((option) => (
            <li key={option} className="flex flex-row items-center gap-2">
              <button
                onClick={() => handleChange(option)}
                className={`${
                  selectedFilter === option ? "text-gtGold" : "text-white"
                } hover:text-gtGold duration-300`}
              >
                {option}
              </button>
            </li>
          ))}
        </ol>
        <Link
          href={`${path}?filter=${selectedFilter.toLowerCase()}`}
          onClick={() => {
            setHideOptions(true);
          }}
          className={`${
            hideOptions ? "hidden" : "flex"
          } bg-gtGold hover:bg-gtGoldHover 
          text-sm duration-500 rounded-lg items-center justify-center p-2`}
        >
          Apply
        </Link>
      </div>
    </div>
  );
};

export default MyRequests;
