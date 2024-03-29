import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Dropdown } from "../components/Dropdown";
import "../css/Survey.css";
import { SyncLoader } from "react-spinners";
import { useNavigate } from "react-router-dom";
import moment from "moment-timezone";
import Modal from "../components/Modal";

interface TeamEntry {
  name: string;
  id: number;
  logo: string;
}

interface LeagueEntry {
  id: number;
  name: string;
  logo: string;
  country_name: string;
  country_flag: string;
  current_season: number;
  teams: TeamEntry[];
}

interface CountryEntry {
  name: string;
  id: number;
  flag: string;
  leagues: LeagueEntry[];
}

interface FavoritesEntry {
  league: string;
  league_id: number;
  league_imgURL: string;
  team: string;
  team_id: number;
  team_imgURL: string;
}

interface OptionEntry {
  name: string;
  id: number;
  imgURL: string;
}

interface PlannerProps {
  public_calendar_url: string;
  calendar_name: string;
  fixtures: { fixture; league; teams }[];
}

const fetchData = async () => {
  let league_data: LeagueEntry[];
  let countries_data: CountryEntry[];
  // fetch league data
  try {
    const league_response = await axios.get("http://localhost:3001/leagues");
    if (league_response.status !== 200)
      throw new Error(league_response.statusText);
    league_data = league_response.data;

    localStorage.setItem("activeLeagues", JSON.stringify(league_data));
  } catch (error) {
    console.error("Error fetching league data:", error);
    return null;
  }
  // fetch country data
  try {
    const countries_response = await axios.get(
      "http://localhost:3001/countries"
    );
    if (countries_response.status !== 200)
      throw new Error(countries_response.statusText);
    countries_data = countries_response.data.countries;

    localStorage.setItem("activeCountries", JSON.stringify(countries_data));
  } catch (error) {
    console.error("Error fetching league data:", error);
    return null;
  }
  // return fetched data
  return { countries_data: countries_data, league_data: league_data };
};

const getCachedData = async () => {
  const cachedLeagues = localStorage.getItem("activeLeagues");
  const cachedCountries = localStorage.getItem("activeCountries");

  if (cachedLeagues && cachedCountries) {
    return {
      countries_data: JSON.parse(cachedCountries),
      league_data: JSON.parse(cachedLeagues),
    };
  } else {
    // Fetch data from the backend and return the result
    try {
      const data = await fetchData();
      return data || { countries_data: null, league_data: null }; // handle the case when fetchData returns null
    } catch (error) {
      console.error("Error fetching data:", error);
      return { countries_data: null, league_data: null };
    }
  }
};

export const Survey = () => {
  const navigate = useNavigate();
  //refs for styling
  const currentSelectionRef = useRef<HTMLDivElement>(null);
  const currentSelectionTitleRef = useRef<HTMLParagraphElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  // favorite teams and leagues
  const [favorites, setFavorites] = useState<FavoritesEntry[]>(() => {
    const localFavorites = localStorage.getItem("favorites");
    return localFavorites
      ? (JSON.parse(localFavorites) as FavoritesEntry[])
      : [];
  });
  // currently selected options
  const [selectedOption, setSelectedOption] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<OptionEntry | null>(
    null
  );
  const [selectedLeague, setSelectedLeague] = useState<OptionEntry | null>(
    null
  );
  const [selectedTeam, setSelectedTeam] = useState<OptionEntry | null>(null);
  // current labels for dropdowns
  const [optionLabel, setOptionLabel] = useState("Select Option");
  const [leagueLabel, setLeagueLabel] = useState(
    `Select League${selectedCountry ? ` in ${selectedCountry.name}` : ""}`
  );
  const [countryLabel, setCountryLabel] = useState("Select Country");
  const [teamLabel, setTeamLabel] = useState("Select Team");
  // currently available options
  const [countryOptions, setCountryOptions] = useState<OptionEntry[]>([]);
  const [leagueOptions, setLeagueOptions] = useState<OptionEntry[]>([]);
  const [teamOptions, setTeamOptions] = useState<OptionEntry[]>([]);
  // country and league data
  const [countries, setCountries] = useState<CountryEntry[]>([]);
  const [leagues, setLeagues] = useState<LeagueEntry[]>([]);
  const [userTimezone, setUserTimezone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // get countries and leagues data when the component mounts
    disableLoading(); // disable loading spinner div
    const getData = async () => await getCachedData();
    getData().then(
      (data: {
        countries_data: CountryEntry[];
        league_data: LeagueEntry[];
      }) => {
        setCountries(data.countries_data);
        setLeagues(data.league_data);
      }
    );
  }, []);

  useEffect(() => {
    setSelectedCountry(null);
  }, [selectedOption]);

  useEffect(() => {
    setSelectedLeague(null);
  }, [selectedCountry]);

  useEffect(() => {
    setSelectedTeam(null);
    if (selectedLeague) {
      const selectedLeagueEntry = leagues.find(
        (league: LeagueEntry) => league.id === selectedLeague.id
      )!;
      if (
        selectedLeagueEntry.teams.find((team) => team.name === "All Teams") ===
        undefined
      ) {
        // add "All Teams" to the beginning of the Teams array only if not already present
        selectedLeagueEntry!.teams.unshift({
          name: "All Teams",
          id: 0,
          logo: selectedLeagueEntry.logo,
        });
        setTeamOptions(
          selectedLeagueEntry.teams.map((team) => ({
            name: team.name,
            id: team.id,
            imgURL: team.logo,
          }))
        );
      }
      //activate current-selection div display
      currentSelectionRef.current!.style.display = "flex";
      currentSelectionTitleRef.current!.style.display = "flex";
    }
  }, [selectedLeague, leagues]);

  useEffect(() => {
    //save favorites to local storage when the favorites state changes
    localStorage.setItem("favorites", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    setCountryLabel("Select Country");
  }, [optionLabel]);

  useEffect(() => {
    setLeagueLabel("Select League");
  }, [countryLabel]);

  useEffect(() => {
    setTeamLabel("Select Team");
  }, [leagueLabel]);

  useEffect(() => {
    if (isLoading) {
      buttonRef.current!.disabled = true;
      buttonRef.current!.style.color = "grey";
      buttonRef.current!.style.backgroundColor = "#1a1a1a";
    }
  }, [isLoading]);

  const deleteFavs = () => {
    localStorage.removeItem("favorites");
    setFavorites([]);
    setSelectedOption("");
    setSelectedCountry(null);
    setSelectedLeague(null);
    setSelectedTeam(null);
    setOptionLabel("Select Option");
    setCountryLabel("Select Country");
    setLeagueLabel("Select League");
    setTeamLabel("Select Team");
    setTeamOptions([]);
    setLeagueOptions([]);
  };

  const removeCurrentSelection = () => {
    setSelectedCountry(null);
    setSelectedLeague(null);
    setSelectedTeam(null);
    setSelectedOption("");
    setOptionLabel("Select Option");
    setCountryLabel("Select Country");
    setLeagueLabel("Select League");
    setTeamLabel("Select Team");
    setTeamOptions([]);
    setLeagueOptions([]);
    currentSelectionRef.current!.style.display = "none";
    currentSelectionTitleRef.current!.style.display = "none";
  };

  const addToFavs = (newFav: FavoritesEntry) => {
    if (favorites.length > 0) {
      const entryFound = favorites.some(
        (fav) => fav.league === newFav.league && fav.team === newFav.team
      );
      // If the new favorite doesn't already exist, add it
      if (!entryFound) setFavorites([...favorites, newFav]);
    } else {
      // if favorites is empty, add new fav -> also saves to localstorage in useEffect
      setFavorites([newFav]);
    }
  };

  const enableLoading = () => {
    setIsLoading(true);
  };

  const disableLoading = () => {
    setIsLoading(false);
  };

  const fetchPlan = async (name, timeZone) => {
    try {
      let planURL = "http://localhost:3001/plan?";
      let delim = "";
      for (let i = 0; i < favorites.length; i++) {
        planURL =
          planURL +
          `${delim}entries[]=${favorites[i].league_id}&entries[]=${favorites[i].team_id}`;
        delim = "&";
      }
      if (name) planURL = planURL + `&name=${name}`;
      if (timeZone) planURL = planURL + `&timeZone=${timeZone}`;

      console.log("fetching... planURL: ", planURL);
      const response = await axios.get(planURL);
      console.log("response: ", response);
      return response;
    } catch (error) {
      console.error("Error fetching plan:", error);
      return null;
    }
  };

  const storeResponse = (data: PlannerProps) => {
    console.log("data: ", data);
    if (data.fixtures.length > 0) {
      const storedPlanners = localStorage.getItem("activePlanners") || "";
      if (storedPlanners === "") {
        localStorage.setItem("activePlanners", JSON.stringify([data]));
        return;
      }
      const currentPlanners = JSON.parse(storedPlanners) as PlannerProps[];
      console.log("currentPlanners: ", currentPlanners);
      currentPlanners.push(data);
      console.log("after concat currentPlanners: ", currentPlanners);
      localStorage.setItem("activePlanners", JSON.stringify(currentPlanners));
    }
  };

  const isAddToFavsDisabled = !selectedLeague || !selectedTeam;

  try {
    return (
      <>
        <div className="survey">
          <h4 className="survey-description">
            Select your favorite teams and leagues
          </h4>

          <Dropdown
            label={optionLabel}
            options={[
              { name: "Leagues", id: -1, imgURL: "img/leagues" },
              { name: "Countries", id: -1, imgURL: "img/countries" },
            ]}
            onSelection={(option: OptionEntry) => {
              setSelectedOption(option.name);
              setSelectedTeam(null);
              setSelectedCountry(null);
              setSelectedLeague(null);
              setTeamLabel("Select Team");
              setLeagueLabel("Select League");
              setCountryLabel("Select Country");
              setTeamOptions([]);

              setOptionLabel(option.name);
              if (option.name.toLowerCase() === "leagues") {
                setLeagueOptions(
                  leagues.map((league) => ({
                    name: league.name,
                    id: league.id,
                    imgURL: league.logo,
                  }))
                );
              } else if (option.name.toLowerCase() === "countries") {
                setCountryOptions(
                  countries.map((country) => ({
                    name: country.name,
                    id: country.id,
                    imgURL: country.flag,
                  }))
                );
              }
            }}
            allowSearch={false}
          />

          {selectedOption.toLowerCase() === "leagues" && (
            <Dropdown
              label={leagueLabel}
              options={leagueOptions}
              onSelection={(option: OptionEntry) => {
                setSelectedLeague(option);
                setLeagueLabel(option.name);
                setSelectedTeam(null);
                setTeamLabel("Select Team");
                setTeamOptions(
                  leagues
                    .find((league) => league.id === option.id)!
                    .teams.map((team) => ({
                      name: team.name,
                      id: team.id,
                      imgURL: team.logo,
                    }))
                );
              }}
              allowSearch={true}
            />
          )}

          {selectedOption.toLowerCase() === "countries" && (
            <Dropdown
              label={countryLabel}
              options={countryOptions}
              onSelection={(option: OptionEntry) => {
                setSelectedCountry(option);
                setCountryLabel(option.name);
                setSelectedLeague(null);
                setLeagueLabel("Select League");
                setSelectedTeam(null);
                setTeamLabel("Select Team");
                setTeamOptions([]);
                setLeagueOptions(
                  leagues
                    .filter((league) => league.country_name === option.name)
                    .map((league) => ({
                      name: league.name,
                      id: league.id,
                      imgURL: league.logo,
                    }))
                );
              }}
              allowSearch={true}
            />
          )}

          {selectedCountry && (
            <Dropdown
              label={leagueLabel}
              options={leagueOptions}
              onSelection={(option: OptionEntry) => {
                setSelectedLeague(option);
                setLeagueLabel(option.name);
                setSelectedTeam(null);
                setTeamLabel("Select Team");
                setTeamOptions(
                  leagues
                    .find((league) => league.id === option.id)!
                    .teams.map((team) => ({
                      name: team.name,
                      id: team.id,
                      imgURL: team.logo,
                    }))
                );
              }}
              allowSearch={true}
            />
          )}

          {selectedLeague && (
            <Dropdown
              label={teamLabel}
              options={teamOptions}
              onSelection={(option: OptionEntry) => {
                setSelectedTeam(option);
                setTeamLabel(option.name);
              }}
              allowSearch={true}
            />
          )}
        </div>
        <div className="fav-container">
          <div className="current-fav-container">
            <p className="selection-title" ref={currentSelectionTitleRef}>
              <strong>Current Selection</strong>{" "}
            </p>
            <div
              id="current-selection"
              className="current-selection"
              ref={currentSelectionRef}
            >
              <div id="current-league" className="current-selection-league">
                {selectedLeague && (
                  <>
                    <img
                      src={selectedLeague.imgURL}
                      alt={selectedLeague.name}
                    />
                    <p>{selectedLeague.name}</p>
                  </>
                )}
              </div>
              <div id="current-team" className="current-selection-team">
                {selectedTeam && (
                  <>
                    <img src={selectedTeam.imgURL} alt={selectedTeam.name} />
                    <p>{selectedTeam.name}</p>
                  </>
                )}
              </div>
            </div>
            <div className="fav-buttons">
              <button
                onClick={() => {
                  removeCurrentSelection();
                  if (selectedLeague && selectedTeam)
                    addToFavs({
                      league: selectedLeague.name,
                      league_id: selectedLeague.id,
                      league_imgURL: selectedLeague.imgURL,
                      team: selectedTeam.name,
                      team_id: selectedTeam.id,
                      team_imgURL: selectedTeam.imgURL,
                    });
                }}
                disabled={isAddToFavsDisabled}
              >
                Add to favorites
              </button>
              <button
                onClick={() => deleteFavs()}
                disabled={favorites.length <= 0}
              >
                Delete Favorites
              </button>
            </div>
          </div>
          <div className="current-favorites">
            <p className="selection-title">
              <strong>Current Favorites</strong>{" "}
            </p>
            {favorites.map((fav: FavoritesEntry, index: number) => (
              <div key={index} className="current-selection">
                {fav && (
                  <>
                    <div className="current-selection-league">
                      <img src={fav.league_imgURL} alt={fav.league} />
                      <p>{fav.league}</p>
                    </div>
                    <div className="current-selection-team">
                      <img src={fav.team_imgURL} alt={fav.team} />
                      <p>{fav.team}</p>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="submit-button">
            <button
              ref={buttonRef}
              onClick={() => {
                const userTimezone = moment.tz.guess();
                setUserTimezone(userTimezone);
                setIsModalOpen(true);
              }}
              disabled={isLoading || favorites.length <= 0}
              style={{
                color: favorites.length <= 0 ? "" : "#2cf200",
              }}
            >
              Create Planner
            </button>
            {isLoading && (
              <div className="loading">
                <SyncLoader
                  color="#2cf200"
                  margin={5}
                  size={16}
                  speedMultiplier={0.6}
                />
              </div>
            )}
            <Modal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              onConfirm={(name: string) => {
                setIsLoading(true);
                setIsModalOpen(false);
                enableLoading();
                fetchPlan(name, userTimezone).then((response) => {
                  if (response?.status === 200) {
                    disableLoading();
                    storeResponse(response.data);
                    navigate("/home");
                  }
                });
              }}
            />
          </div>
        </div>
      </>
    );
  } catch (error) {
    console.error("Error displaying data:", error);
    return () => <div>Error displaying data</div>;
  }
};

export default Survey as React.FC;
