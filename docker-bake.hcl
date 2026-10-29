variable "CACHE" {
  default = ""
}

function "cache_from" {
  params = [scope]
  result = CACHE == "gha" ? ["type=gha,scope=${scope}"] : []
}

function "cache_to" {
  params = [scope]
  result = CACHE == "gha" ? ["type=gha,scope=${scope},mode=max"] : []
}

group "default" {
  targets = ["check", "unit"]
}

group "check" {
  targets = ["lint", "build"]
}

target "lint" {
  target     = "lint"
  output     = ["type=cacheonly"]
  cache-from = cache_from("lint")
  cache-to   = cache_to("lint")
}

target "unit" {
  target     = "unit"
  output     = ["type=cacheonly"]
  cache-from = cache_from("unit")
  cache-to   = cache_to("unit")
}

target "build" {
  target     = "build"
  output     = ["type=cacheonly"]
  cache-from = cache_from("build")
  cache-to   = cache_to("build")
}

target "e2e" {
  target     = "e2e"
  tags       = ["boxlead-front-e2e:ci"]
  output     = ["type=docker"]
  cache-from = cache_from("e2e")
  cache-to   = cache_to("e2e")
}

target "report" {
  target     = "deps"
  tags       = ["boxlead-front-deps:ci"]
  output     = ["type=docker"]
  cache-from = cache_from("lint")
}
