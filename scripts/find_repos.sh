#!/bin/bash
# filepath: /workspaces/crmuo-home-ops/find_repos.sh

# Setup directories for data persistence
data_dir="gh_search_data"
mkdir -p "$data_dir"

# Output file - CSV with repo name and status
repos_file="$data_dir/repositories.csv"

# Initialize repositories file if it doesn't exist
if [[ ! -f "$repos_file" ]]; then
  echo "repository,status" > "$repos_file"
fi

# Calculate date 6 months ago - fixing the calculation
current_year=$(date +%Y)
current_month=$(date +%m)
current_day=$(date +%d)

# Calculate 6 months ago
if (( current_month <= 6 )); then
  # Go back to previous year
  year=$((current_year - 1))
  month=$((current_month + 6))
else
  year=$current_year
  month=$((current_month - 6))
fi

six_months_ago="${year}-$(printf "%02d" $month)-$current_day"
echo "Searching for repositories updated since: $six_months_ago"

# Search parameters - using proper code search syntax
base_url="https://api.github.com/search/code"
query="kustomize.toolkit.fluxcd.io in:file path:kubernetes/apps"
encoded_query=$(printf '%s' "$query" | jq -sRr @uri)

# Debug the query
echo "Using search query: $query"

# Check rate limits and wait if needed
check_rate_limits() {
  local rate_info=$(gh api /rate_limit --jq '.resources.code_search')
  local remaining=$(echo "$rate_info" | jq -r '.remaining')
  local reset_time=$(echo "$rate_info" | jq -r '.reset')
  local limit=$(echo "$rate_info" | jq -r '.limit')
  local current_time=$(date +%s)

  echo "Code Search API rate limit: $remaining/$limit remaining"

  if [ "$remaining" -le 2 ]; then
    local wait_time=$((reset_time - current_time + 5))
    echo "Rate limit almost exhausted. Waiting for $wait_time seconds until reset..."
    sleep $wait_time
    return 1
  fi
  return 0
}

# Initial variables for pagination
per_page=100
page=1
has_more=true

echo "Searching for repositories with Kubernetes applications updated in the past 6 months..."

# Process each page
while $has_more; do
  # Check if we need to wait for rate limits
  check_rate_limits || continue

  # Fetch current page
  url="${base_url}?q=${encoded_query}&page=${page}&per_page=${per_page}"
  echo "Fetching page $page..."

  # Use conservative delay between requests
  sleep 2

  response=$(gh api -H "Accept: application/vnd.github+json" \
             -H "X-GitHub-Api-Version: 2022-11-28" "$url")

  # Check for error in response
  if [[ $(echo "$response" | jq -r 'has("message")') == "true" ]]; then
    error_msg=$(echo "$response" | jq -r '.message')
    echo "Error: $error_msg"

    if [[ "$error_msg" == *"Cannot access beyond the first 1000 results"* ]]; then
      echo "Hit GitHub's 1000 results limit. This is the maximum GitHub allows."
      break
    elif [[ "$error_msg" == *"rate limit exceeded"* ]]; then
      # Get reset time from rate limit API
      rate_info=$(gh api /rate_limit --jq '.resources.code_search')
      reset_time=$(echo "$rate_info" | jq -r '.reset')
      current_time=$(date +%s)
      wait_time=$((reset_time - current_time + 10))

      echo "Rate limit exceeded. Waiting until reset: $wait_time seconds"
      sleep $wait_time
      continue
    else
      echo "Error occurred. Waiting 30 seconds before retry..."
      sleep 30
      continue
    fi
  fi

  # Process results and append repositories to the file
  items_count=$(echo "$response" | jq -r '.items | length')

  if [[ $items_count -eq 0 ]]; then
    has_more=false
    echo "No more results."
  else
    # Extract unique repositories and append to the file (if not already there)
    echo "$response" | jq -r '.items[].repository.full_name' | sort -u | while read -r repo; do
      # Check if repo is already in the file
      if ! grep -q "^$repo," "$repos_file"; then
        echo "$repo,pending" >> "$repos_file"
        echo "Added repository: $repo"
      fi
    done

    # Check if we've reached the last page or GitHub's limit
    total_count=$(echo "$response" | jq -r '.total_count')
    if [ $((page * per_page)) -ge "$total_count" ] || [ $((page * per_page)) -ge 1000 ]; then
      has_more=false
      echo "Reached end of results ($total_count items total, GitHub limit: 1000)."
    else
      # Increment page
      ((page++))
    fi
  fi
done

repo_count=$(grep -c "pending" "$repos_file")
echo "Found $repo_count repositories with Kubernetes applications updated in the past 6 months."
echo "Repository list saved to $repos_file"
