# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Stage 1 — Build & publish bằng .NET SDK 8.0 (không cần cài .NET trên server)
# ---------------------------------------------------------------------------
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy riêng .csproj trước để tận dụng cache lớp restore
COPY ["src/TimesheetBlogMeeting.API/TimesheetBlogMeeting.API.csproj", "src/TimesheetBlogMeeting.API/"]
RUN dotnet restore "src/TimesheetBlogMeeting.API/TimesheetBlogMeeting.API.csproj"

# Copy toàn bộ source rồi publish ở chế độ Release
COPY . .
RUN dotnet publish "src/TimesheetBlogMeeting.API/TimesheetBlogMeeting.API.csproj" \
    -c Release -o /app/publish /p:UseAppHost=false

# ---------------------------------------------------------------------------
# Stage 2 — Runtime gọn nhẹ (chỉ chứa ASP.NET Core runtime + app đã publish)
# ---------------------------------------------------------------------------
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Kestrel lắng nghe cổng 8080 bên trong container
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080

ENTRYPOINT ["dotnet", "TimesheetBlogMeeting.API.dll"]
